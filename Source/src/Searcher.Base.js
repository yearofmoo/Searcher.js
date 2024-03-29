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
