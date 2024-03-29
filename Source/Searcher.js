/*
---
description: Searcher.js is a massive wrapper for all UI searching functionality on a webpage

license: MIT License http://www.opensource.org/licenses/mit-license.php

authors:
- Matias Niemelä (matias [at] yearofmoo [dot] com)

home:
- http://www.yearofmoo.com/Searcher.js

requires:
- MooTools Core 1.3+
- more (Class.Binds, Fx.Scroll)
- MooTools-Class.Accessor
- MooTools-Event.outerClick

provides: 
- Searcher
- Searcher.AutoComplete
- Searcher.Local
- Searcher.AutoComplete.Local
- Searcher.Local.Filterer
- Searcher.AutoComplete.Local.Filterer
- Searcher.Local.Spotlight
- Searcher.Loaders

*/
Locale.define('en-US','Searcher',{

  messages : {
    idle : 'Search for something...',
    noResults : 'No results found for %(SEARCH)',
    loading : 'Searching Please Wait...',
    minSearch : 'Please enter %(MIN) or more characters...'
  }

});
var Searcher;

(function() {

var klassify = function(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
};

Searcher = new Class({

  Implements : [Options, Events],

  Accessors : ['method','URL','input','container','loaderOptions','XHR','previousSearchString'],

  Binds : ['onResponse','onFailure','onComplete','onRequest','onTimeout','search','onEscape','onFocus','onBlur','removeAnchor'],

  options : {
    containerClassName : 'autocomplete-results',
    minSearchLength : 3,
    clearResultsOnMinSearch : true,
    prepareSearch : function(search) {
      return search.trim();
    },
    showLoading : true,
    loader : 'spinner',
    replaceURL : function(search,url) {
      var base = url + (url.contains('?') ? '&' : '?');
      base += 'q=' + search;
      this.getAnchors().each(function(anchor) {
        base += '&' + anchor.getSearchString();
      });
      return base;
    },
    keyInputDelay : 250,
    requestOptions : {
    },
    loaderOptions : {
    },
    inputOptions : {
    },
    containerOptions : {
    },
    whenNoResults : null,
    noResultsClassName : 'no-results',
    anchorStageElementOptions : {
      'class':'searcher-anchor-stage'
    },
    anchorOptions : {

    },
    messageElementOptions : 'searcher-message',
    clearResultsOnMessageDisplay : true,
    messages : {
      idle : Locale.get('Searcher.messages.idle'),
      noResults : Locale.get('Searcher.messages.noResults'),
      loading : Locale.get('Searcher.messages.loading'),
      minSearch : Locale.get('Searcher.messages.minSearch')
    }
  },

  initialize : function(input,container,options) {
    this.options.replaceURL = this.options.replaceURL.bind(this);
    input = document.id(input);
    if(!input) {
      throw new Error('Searcher.js: input element not found');
    }
    container = document.id(container);
    if(!container) {
      throw new Error('Searcher.js: container element not found');
    }
    this.setInput(input);
    this.setContainer(container);
    this.setOptions(options);
    this.buildOptions();
    this.buildInput();
    this.buildContainer();
    this.setupEvents();
    this.enable();
  },

  disable : function() {
    this.disabled = false;
  },

  enable : function() {
    this.disabled = false;
  },

  isEnabled : function() {
    return ! this.isDisabled();
  },

  isDisabled : function() {
    return this.disabled;
  },

  buildOptions : function() {
    var form = this.options.form || this.getInput().getParent('form');
    if(form) {
      this.buildOptionsFromForm(form);
    }
    if(this.options.url) {
      this.setURL(this.options.url);
    }
    if(this.options.method) {
      this.setMethod(this.options.method);
    }
    if(this.options.loaderOptions) {
      this.setLoaderOptions(this.options.loaderOptions);
    }
  },

  buildOptionsFromForm : function(form) {
    this.setMethod(form.get('method'));
    this.setURL(form.get('action'));
  },

  buildInput : function() {
    this.getInput().set(this.options.inputOptions);
  },

  buildContainer : function() {
    var container = this.getContainer();
    container.set(this.options.containerOptions);
    if(this.options.containerClassName) {
      container.addClass(this.options.containerClassName);
    }
  },

  setupEvents : function() {
    this.getInput().addEvents({
      'focus':this.onFocus,
      'blur':this.onBlur,
      'keydown':this.onInput.bind(this)
    });
    this.addEvent('_search:pause('+this.options.keyInputDelay+')',this.search.bind(this));
  },

  getURL : function(search) {
    var url = this.URL;
    if(url) {
      var fn = this.options.replaceURL;
      if(fn && typeOf(fn) == 'function') {
        url = fn(search,url);
      }
    }
    return url;
  },

  getLoadingObjectClassName : function() {
    var def = 'spinner';
    try {
      var klass = klassify(this.options.loader);
      if(!klass || !Searcher.Loaders[klass] || !Searcher.Loaders[klass].defined()) {
        throw new Error;
      }
      return klass;
    }
    catch(e) {
      return klassify(def);
    }
  },

  getLoadingObject : function() {
    if(!this.loadingObject) {
      this.loadingObject = Object.clone(Searcher.Loaders[this.getLoadingObjectClassName()]);
      this.loadingObject.init(this.getInput(),this.getContainer(),this.getLoaderOptions());
    }
    return this.loadingObject;
  },

  getRequester : function() {
    if(!this.requester) {
      var that = this;
      options = Object.append(this.options.requestOptions,{
        onSuccess : this.onResponse,
        onFailure : this.onFailure,
        onRequest : function() {
          that.setXHR(this);
          that.onRequest();
        },
        onTimeout : this.onTimeout,
        onCancel : this.onCancel
      });
      this.requester = new Request(options);
      this.requester.id = this.options.id;
    }
    return this.requester;
  },

  search : function(data) {
    data = data && typeOf(data) == 'string' ? data : this.getSearchString();
    if(this.options.prepareSearch) {
      data = this.options.prepareSearch(data);
    }
    if(data.length >= this.options.minSearchLength) {
      this.request(data);
    }
    else {
      this.onMinSearch();
    }
  },

  isRequesting : function() {
    return this.getRequester().isRunning();
  },

  request : function(data) {
    if(this.isRequesting()) {
      this.cancel();
    }
    this.getRequester().setOptions({
      url : this.getURL(data),
      method : this.getMethod() || 'GET'
    }).send();
  },

  onInput : function(event) {
    switch(event.key) {
      case 'esc':
        this.onEscape();
      break;
      case 'enter':
        event.stop();
        this.onEnter();
      break;
      default:
        //this makes sure that the input field has the latest search value
        this.onBeforeSearch.delay(10,this);
      break;
    }
  },

  onBeforeSearch : function() {
    var str = this.getSearchString();
    if(str.length == 0) {
      this.onEmpty();
    }
    else if(str != this.getPreviousSearchString()) { 
      this.fireEvent('_search');
    }
  },

  onEnter : function() {
    this.search();
  },

  onEscape : function() {
    if(this.isEmptySearch()) {
      this.onEmpty();
    }
    else {
      this.clearSearch();
    }
  },

  destroyNoResultsElement : function() {
    try {
      this.getContainer().getElement('.'+this.options.noResultsClassName).destroy();
    }
    catch(e) { }
  },

  onNoResults : function() {
    this.clearResults();
    if(this.options.whenNoResults) {
      var noResults = new Element('div').addClass(this.options.noResultsClassName).inject(this.getContainer());
      this.options.whenNoResults(this, noResults);
    }
    else {
      this.displayMessage(this.options.messages.noResults);
    }
    this.fireEvent('noResults');
  },

  onRequest : function() {
    this.fireEvent('request');
    this.setPreviousSearchString(this.getSearchString());
    this.showLoading();
  },

  onResponse : function(html) {
    this.fireEvent('response');
    if(!html || html.length == 0) {
      this.onNoResults();
    }
    else {
      this.onSuccess(html);
    }
  },

  onSuccess : function(html) {
    this.updateLoading();
    this.fireEvent('beforeResults');
    this.buildResults(html);
    this.onResults();
    this.fireEvent('afterResults');
    this.onComplete();
  },

  onResults : function() {
    this.fireEvent('results');
  },

  buildResults : function(html) {
    if(typeOf(html) == 'array') {
      html = html.join('');
    }
    this.getContainer().set('html',html);
  },

  onFailure : function() {
    this.onComplete();
  },

  onComplete : function() {
    this.hideLoading();
    this.fireEvent('complete');
  }, 

  onTimeout : function() {
    this.fireEvent('timeout');
  },

  onCancel : function() {
  },

  cancel : function() {
    this.getRequester().cancel();
  },

  clear : function() {
    this.clearSearch();
    this.clearResults();
  },

  clearResults : function() {
    this.getContainer().empty();
  },

  clearSearch : function() {
    this.getInput().set('value','');
  },

  getSearchString : function() {
    return this.getInput().get('value');
  },

  isEmptySearch : function() {
    return this.getSearchString().length == 0;
  },

  isEmptyResults : function() {
    return this.getContainer().childNodes.length == 0;
  },

  showLoading : function() {
    if(this.options.showLoading) {
      this.fireEvent('showLoading');
      this.getLoadingObject().show(this.getInput(),this.getContainer());
      this.displayMessage(this.options.messages.loading);
    }
  },

  hideLoading : function() {
    if(this.options.showLoading) {
      this.fireEvent('hideLoading');
      this.getLoadingObject().hide(this.getInput(),this.getContainer());
    }
  },

  updateLoading : function() {
    if(this.options.showLoading) {
      this.getLoadingObject().update(this.getInput(),this.getContainer());
    }
  },

  onFocus : function() {
    this.fireEvent('focus');
  },

  onBlur : function() {
    this.fireEvent('blur');
  },

  onEmpty : function() {
    this.clearResults();
    this.displayMessage(this.options.messages.idle);
  },

  onMinSearch : function() {
    if(this.options.clearResultsOnMinSearch) {
      this.clearResults();
    }

    this.displayMessage(this.options.messages.minSearch);
  },

  prepareMessage : function(text) {
    text = text.replace('%(MIN)',this.options.minSearchLength);
    text = text.replace('%(SEARCH)',this.getSearchString());
    return text;
  },

  displayMessage : function(message) {
    if(message && message.length > 0) {
      message = this.prepareMessage(message);
      var container = this.getContainer();
      if(this.options.clearResultsOnMessageDisplay) {
        container.empty();
      }
      var id = 'searcher-message-element';
      var elm = container.getElement('#'+id);
      if(elm) {
        elm.set('html',message);
      }
      else {
        elm = new Element('div',this.options.messageElementOptions).set('id',id).set('html',message)
      }
      elm.inject(container,'top');
    }
  },

  destroy : function() {
    this.destroyContainer();
    this.destroyInput();
  },

  destroyContainer : function() {
    this.getContainer().destroy();
  },

  destroyInput : function() {
    this.getInput().destroy();
  },

  addAnchor : function(anchor) {
    anchor.setOptions(this.options.anchorOptions);
    anchor.addEvents({
      'destroy':this.removeAnchor
    });
    this.getAnchorStage().adopt(anchor);
    this.getAnchors().push(anchor);
  },

  getAnchorStage : function() {
    if(!this.anchorStage) {
      this.anchorStage = new Element('div',this.options.anchorStageElementOptions).inject(this.getInput(),'before');
    }
    return this.anchorStage;
  },

  getAnchors : function() {
    if(!this.anchors) {
      this.anchors = [];
    }
    return this.anchors;
  },

  getTotalAnchors : function() {
    return this.getAnchors().length;
  },

  getAnchor : function(anchor) {
    if(instanceOf(anchor,Searcher.Anchor)) {
      return anchor;
    }
    else if(typeOf(anchor) == 'integer') {
      return this.getAnchorByIndex(anchor);
    }
    else {
      return this.getAnchorByText(anchor);
    }
  },

  getAnchorByIndex : function(index) {
    if(index >= 0 && index < this.getTotalAnchors()) {
      return this.getAnchors()[index];
    }
  },

  getAnchorByText : function(text) {
    var anchors = this.getAnchors();
    for(var i=0;i<anchors.length;i++) {
      var anchor = anchors[i];
      if(anchor.equals(text)) {
        return anchor;
      }
    }
  },

  removeAnchor : function(a) {
    a = this.getAnchor(a);
    for(var i=0;i<this.anchors.length;i++) {
      var anchor = this.anchors[i];
      if(anchor.equals(a)) {
        anchor.destroy();
        delete this.anchors[i];
        break;
      }
    }
    this.anchors = this.anchors.clean();
  },

  addAnchors : function(anchors) {
    anchors.each(this.addAnchor,this);
  }

});

})();
(function() {

Searcher.AutoComplete = new Class({

  Extends : Searcher,

  Binds : ['show','hide','delayHide','onSelect','onClick','onHover'],  

  options : {
    maxResults : 0,
    hoverFirstResult : true,
    hideOnSelect : true,
    hideOnOuterClick : true,
    updateSearchStringOnSelect : true,
    updateSearchStringByResult : null,
    resultClassName : 'result',
    activeResultClassName : 'active',
    proxy : null,
    zIndex : null
  },

  initialize : function(input,container,options) {
    if(arguments.length == 2) {
      options = container;
      container = this.createContainer();
    }
    this.parent(input,container,options);
    this.position();
    this.hide();
  },

  createContainer : function() {
    return new Element('div',{
      'styles':{
        'position':'absolute'
      }
    }).inject(document.body);
  },

  isStaticContainer : function() {
    return this.getContainer().getStyle('position') != 'absolute';
  },

  isPositionedContainer : function() {
    return !this.isStaticContainer();
  },

  buildContainer : function() {
    this.parent();
    var container = this.getContainer();
    if(this.isStaticContainer() && this.options.zIndex) {
      container.setStyle('z-index',this.options.zIndex);
    }
  },

  setupEvents : function() {
    this.parent();
    var events = {};
    var relay = 'relay('+this.getResultSelector()+')';
    events['click:'+relay] = this.onClick;
    events['mouseenter:'+relay] = this.onHover;
    this.getContainer().addEvents(events);

    if(this.options.hideOnOuterClick) {
      this.getContainer().addEvent('outerClick',this.delayHide);
    }
  },

  getResultSelector : function() {
    return '.' + this.options.resultClassName;
  },

  onClick : function(event,target) {
    event.stop();
    var result = document.id(target);
    if(result) {
      this.onSelect(result);
    }
  },

  onHover : function(event,target) {
    if(arguments.length == 1) {
      target = event;
    }
    var result = document.id(target);
    if(result) {
      this.setActiveResult(result);
    }
  },

  onSelect : function(result) {
    if(this.options.updateSearchStringOnSelect && typeOf(this.options.updateSearchStringByResult) == 'function') {
      this.options.updateSearchStringByResult(result);
    }
    if(this.options.hideOnSelect) {
      this.hide();
    }
    this.fireEvent('select',[result]);
  },

  position : function() {
    if(this.isPositionedContainer()) {
      var proxy = this.getPositionProxyElement();
      var coords = proxy.getCoordinates();
      var x = coords['left'];
      var y = coords['top'] + coords['height'];
      var w = coords['width'];
      this.getContainer().setStyles({
        'left' : x,
        'top' : y,
        'width' : w
      });
    }
  },

  setPositionProxyElement : function(element) {
    this.proxy = element;
  },

  getPositionProxyElement : function() {
    if(!this.proxy) {
      return this.getInput();
    }
    return this.proxy;
  },

  getPreviousResult : function() {
    var result;
    try {
      result = this.getActiveResult().getPrevious(this.getResultSelector());
      if(!result) {
        throw new Error;
      }
    }
    catch(e) {
      result = this.getLastResult();
    }
    return result;
  },

  getNextResult : function() {
    var result;
    try {
      result = this.getActiveResult().getNext(this.getResultSelector());
      if(!result) {
        throw new Error;
      }
    }
    catch(e) {
      result = this.getFirstResult();
    }
    return result;
  },

  selectCurrentActiveResult : function() {
    var active = this.getActiveResult();
    if(active) {
      this.onSelect(active);
    }
  },

  onEnter : function() {
    if(this.hasActiveResult()) {
      this.selectCurrentActiveResult();
    }
    else {
      this.parent();
    }
  },

  onInput : function(event) {
    switch(event.key) {
      case 'up':
        event.stop();
        this.onUp();
      break;
      case 'down':
        event.stop();
        this.onDown();
      break;
      default:
        this.parent(event);
      break;
    }
  },

  onDown : function() {
    this.onMovement(this.getNextResult());
  },

  onUp : function() {
    this.onMovement(this.getPreviousResult());
  },

  onMovement : function(result) {
    if(this.isHidden()) {
      this.show();
    }
    else {
      this.setActiveResult(result);
    }
  },

  onResults : function() {
    if(this.options.hoverFirstResult) {
      this.onHover(this.getFirstResult());
    }
    this.position();
    this.show();
  },

  onRequest : function() {
    this.parent();
    this.position();
  },

  deactivateResults : function() {
    this.getResults().removeClass(this.options.activeResultClassName);
  },

  setActiveResult : function(result) {
    this.deactivateResults(); 
    this.activateResult(result);
  },

  activateResult : function(result) {
    result.addClass(this.options.activeResultClassName);
  },

  hasActiveResult : function() {
    return !! this.getActiveResult();
  },

  getActiveResult : function() {
    return this.getContainer().getElement(this.getResultSelector() + '.' + this.options.activeResultClassName);
  },

  getResults : function() {
    return this.getContainer().getElements(this.getResultSelector());
  },

  getResult : function(index) {
    return this.getResults()[index];
  },

  getFirstResult : function() {
    return this.getResult(0);
  },

  getLastResult : function() {
    return this.getResult(this.getTotalResults()-1);
  },

  getTotalResults : function() {
    return this.getResults().length;
  },

  hasResults : function() {
    return this.getTotalResults() > 0;
  },

  show : function() {
    this.getContainer().setStyle('display','block');
  },

  hide : function() {
    this.getContainer().setStyle('display','none');
  },

  delayHide : function(delay) {
    this.hide.delay(delay || 100,this);
  },

  isVisible : function() {
    return ! this.isHidden();
  },

  isHidden : function() {
    return this.getContainer().getStyle('display') == 'none';
  },

  onFocus : function() {
    this.parent();
    if(this.hasResults()) {
      this.show();
    }
  },

  onBlur : function() {
    this.parent();
    this.delayHide();
  },

  onEscape : function() {
    if(this.isHidden()) {
      this.clear();
    }
    else {
      this.hide();
    }
  },

  onNoResults : function() {
    this.parent();
    if(this.options.whenNoResults) {
      this.show();
    }
    else {
      this.hide();
    }
  },

  onEmpty : function() {
    this.hide();
  },

  onMinSearch : function() {
    if(this.options.clearResultsOnMinSearch) {
      this.hide();
    }
  },

});

})();
(function() {

Searcher.Local = new Class({
  Extends : Searcher
});

Searcher.AutoComplete.Local = new Class({

  Extends : Searcher.AutoComplete,

  buildResults : function(results) {
    this.parent(results);
    this.getContainer().getChildren().addClass(this.options.resultClassName);
  }

});

[Searcher.Local,Searcher.AutoComplete.Local].each(function(klass) {
  
  klass.implement({

    Accessors : ['localResults'],

    options : {
      matchAnalyzer : function(result, search) {
        return result.title.contains(search);
      }
    },

    initialize : function() {
      this.parent.apply(this,arguments);
      if(this.options.results) {
        this.setLocalResults(this.options.results);
      }
    },

    request : function(data) {
      this.onRequest();
      var results = [];
      this.getLocalResults().each(function(result) {
        if(this.isMatchingResult(result,data)) {
          results.push(this.getElementFromResult(result));
        }
      },this);
      this.onResponse(results);
    },

    isMatchingResult : function(result,search) {
      return this.options.matchAnalyzer(result,search);
    },

    getElementFromResult : function(result) {
      if(result.html) {
        return result.html;
      }
      else if(result.element) {
        return result.element.get('html');
      }
    }

  });

});

})();
(function() {

Searcher.Local.Filterer = new Class({

  Extends : Searcher.Local,

  styleResults : {

  }

});

Searcher.AutoComplete.Local.Filterer = new Class({

  Extends : Searcher.AutoComplete.Local,

  styleResults : function() {
    this.getContainer().getChildren().addClass(this.options.resultClassName);
  },

  isVisibleResult : function(result) {
    return result.getStyle('display')=='block';
  },

  getResults : function() {
    return this.parent().filter(this.isVisibleResult,this);
  },

  getPreviousResult : function() {
    var result;
    try {
      result = this.getActiveResult().getAllPrevious(this.getResultSelector()).filter(this.isVisibleResult,this)[0];
      if(!result) {
        throw new Error;
      }
    }
    catch(e) {
      result = this.getLastResult();
    }
    return result;
  },

  getNextResult : function() {
    var result;
    try {
      result = this.getActiveResult().getAllNext(this.getResultSelector()).filter(this.isVisibleResult,this)[0];
      if(!result) {
        throw new Error;
      }
    }
    catch(e) {
      result = this.getFirstResult();
    }
    return result;
  },

  onSelect : function(result) {
    this.parent(result);
    this.deactivateResults();
    this.clearSearch();
  }

});

[Searcher.AutoComplete.Local.Filterer,Searcher.Local.Filterer].each(function(klass) {
  
  klass.implement({

    options : {
      matchAnalyzer : function(result, search) {
        return result.get('html').replace(/<\/?.+?>/g,'').contains(search);
      } 
    },

    initialize : function(input,container,resultsSelector,options) {
      options = options || {};
      delete options.results;
      this.resultsSelector = resultsSelector;
      this.parent(input,container,options);
    },

    createContainer : function() {
      return new Element('div',{
        'styles':{
          'position':'static'
        }
      }).inject(document.body);
    },

    getLocalResults : function() {
      return this.getContainer().getElements(this.resultsSelector);
    },

    getElementFromResult : function(result) {
      return result;
    },

    hideAllElements : function() {
      this.getLocalResults().setStyle('display','none');
    },

    showAllElements : function() {
      this.getLocalResults().each(this.showElement,this);
    },

    showElements : function(elements) {
      elements.each(this.showElement,this);
    },

    showElement : function(element) {
      element.setStyle('display','block');
    },

    buildResults : function(elements) {
      this.destroyNoResultsElement();
      this.hideAllElements();
      this.showElements(elements);
      this.styleResults();
    },

    hide : function() {
      this.showAllElements();
    },

    clearResults : function() {
      this.destroyNoResultsElement();
      this.hideAllElements();
    }

  });

});

})();
(function() {

Searcher.Local.Spotlight = new Class({

  Extends : Searcher.Local.Filterer,

  options : {
    spotlightClassName : null 
  },

  hideAllElements : function() {
    this.getLocalResults().removeClass(this.options.spotlightClassName);
  },

  showElements : function(elements) {
    $$(elements).addClass(this.options.spotlightClassName);
  },

  onNoResults : function() { }

});

})();
(function() {

Searcher.Loaders = {};

Searcher.Loaders.Spinner = {

  defined : function() {
    return !! window.Spinner;
  },

  init : function(input,container,options) {
    this.spinner = new Spinner(container,options);
  },

  show : function(input,container) {
    this.spinner.show();
  },

  hide : function(input,container) {
    this.spinner.hide();
  },

  update : function(input,container) {
    this.spinner.position();
  }

};

Searcher.Loaders.CursorLoader = {

  defined : function() {
    return !! window.CursorLoader;
  },

  init : function(input,container,options) {
    CursorLoader.init(options);
  },

  show : function(input,container) {
    CursorLoader.show();
  },

  hide : function(input,container) {
    CursorLoader.hide();
  },

  update : function() { }

};

})();
Searcher.Anchor = new Class({

  Binds : ['nix','destroy','onCloseClick'],

  Implements : [Options, Events],

  options : {
    elementOptions : {
      'class':'searcher-anchor'
    },
    stageElementOptions : {},
    closeActionElementOptions : {
      'class':'anchor-close'
    }
  },

  initialize : function(text,search,options) {
    this.setOptions(options);
    this.build();
    this.setupEvents();
    this.setText(text);
    this.setSearch(search);
  },

  build : function() {
    this.buildElement();
    this.buildActions();
    this.buildStage();
  },

  buildElement : function() {
    this.element = new Element('div',this.options.elementOptions);
    if(this.options.className) {
      this.element.className += ' ' + this.options.className;
    }
  },

  buildStage : function() {
    this.stage = new Element('div',this.options.stageElementOptions).inject(this.getElement());
  },

  buildActions : function() {
    this.closeAction = new Element('div',this.options.closeActionElementOptions).inject(this.getElement());
  },

  setupEvents : function() {
    this.getCloseAction().addEvent('click',this.onCloseClick);
  },

  getElement : function() {
    return this.element;
  },

  toElement : function() {
    return this.getElement();
  },

  getStage : function() {
    return this.stage;
  },

  getCloseAction : function() {
    return this.closeAction;
  },

  setText : function(text) {
    var stage = this.getStage();
    if(typeOf(text) == 'element') {
      stage.adopt(text);
    }
    else {
      stage.set('html',text);
    }
  },

  getText : function() {
    return this.getStage().get('html');
  },

  setSearch : function(search) {
    this.search = search;
  },

  getSearch : function() {
    return this.search;
  },

  getSearchString : function() {
    return Object.toQueryString(this.getSearch());
  },

  onCloseClick : function(event) {
    event.stop();
    this.nix();
  },

  destroy : function() {
    this.destroy = function() {};
    this.getElement().destroy();
    this.fireEvent('destroy',[this]);
  },

  nix : function() {
    this.getElement().get('morph').start({ 'opacity':0 }).chain(this.destroy);
  },

  equals : function(text) {
    if(instanceOf(text,Searcher.Anchor)) {
      text = text.getText();
    }
    return text == this.getText();
  }

});
