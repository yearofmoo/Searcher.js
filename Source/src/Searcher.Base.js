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
    clearResultsOnMinSearch : true,
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
    else {
      this.onMinSearch();
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
      this.fireEvent('showLoading');
      this.getLoadingObject().show(this.getInput(),this.getContainer());
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
  },

  onMinSearch : function() {
    if(this.options.clearResultsOnMinSearch) {
      this.clearResults();
    }
  },

  destroy : function() {
    this.getContainer().destroy();
    this.getInput().destroy();
  }

});

})();
