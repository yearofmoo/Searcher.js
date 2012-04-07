var Searcher;

(function() {

var klassify = function(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
};

Searcher = new Class({

  Implements : [Options, Events],

  Accessors : ['method','URL','input','container','loaderOptions','XHR','previousSearchString'],

  Binds : ['onResponse','onFailure','onComplete','onRequest','onTimeout','search','onEscape','onFocus','onBlur'],

  options : {
    containerClassName : 'autocomplete-results',
    minSearchLength : 2,
    prepareSearch : function(search) {
      return search.trim();
    },
    showLoading : true,
    loader : 'spinner',
    replaceURL : function(search,url) {
      return url + (url.contains('?') ? '&' : '?') + 'q=' + search;
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
    whenNoResults : function(container) {
      container.set('html','No Results Found');
    },
    noResultsClassName : 'no-results'
  },

  initialize : function(input,container,options) {
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
    if(data.length > this.options.minSearchLength) {
      this.request(data);
    }
  },

  request : function(data) {
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
    if(this.getSearchString() != this.getPreviousSearchString()) { 
      this.fireEvent('_search');
    }
  },

  onEnter : function() {
    this.search();
  },

  onEscape : function() {
    if(this.isEmptySearch()) {
      this.clearResults();
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
      this.options.whenNoResults(noResults);
    }
    this.fireEvent('noResults');
  },

  onRequest : function() {
    this.setPreviousSearchString(this.getSearchString());
    this.showLoading();
  },

  onResponse : function(html) {
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
    this.fireEvent('cancel');
    this.clear();
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
      this.getLoadingObject().show(this.getInput(),this.getContainer());
    }
  },

  hideLoading : function() {
    if(this.options.showLoading) {
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

  destroy : function() {
    this.getContainer().destroy();
    this.getInput().destroy();
  }

});

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

  initialize : function(input,options) {
    var container = this.createContainer();
    this.parent(input,container,options);
    this.position();
    this.hide();
  },

  createContainer : function() {
    return new Element('div').inject(document.body);
  },

  buildContainer : function() {
    this.parent();
    var container = this.getContainer();
    container.setStyles({
      'position':'absolute'
    });
    if(this.options.zIndex) {
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
  }

});

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

    setLocalResults : function(hash) {
      this.localResults = hash;
    },

    getLocalResults : function(hash) {
      return this.localResults;
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

Searcher.Local.Filterer = new Class({

  Extends : Searcher.Local,

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

  getLocalResults : function() {
    return this.getContainer().getElements(this.resultsSelector);
  },

  getElementFromResult : function(result) {
    return result;
  },

  hideAllElements : function() {
    this.getLocalResults().setStyle('display','none');
  },

  showElements : function(elements) {
    $$(elements).setStyle('display','block');
  },

  buildResults : function(elements) {
    this.destroyNoResultsElement();
    this.hideAllElements();
    this.showElements(elements);
  },

  clearResults : function() {
    this.destroyNoResultsElement();
    this.hideAllElements();
  }

});

Searcher.Local.Spotlight = new Class({

  Extends : Searcher.Local.Filterer,

  options : {
    spotlightClassName : null 
  },

  hideAllElements : function() {
    this.getLocalResults().removeClass(this.options.spotlightClassName);
  },

  buildResults : function(elements) {
    $$(elements).addClass(this.options.spotlightClassName);
  }

});

Searcher.Loaders = {}

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
