var Searcher;

(function() {

var klassify = function(str) {
  return str.charAt(0).toUpperCase() + str.substr(1);
};

Searcher = new Class({

  Implements : [Options, Events],

  Binds : ['onResponse','onFailure','onComplete','onRequest','onTimeout','search','onInput','onEscape','onFocus','onBlur'],

  Accessors : ['method','URL','input','container','loaderOptions','XHR'],

  options : {
    minSearchLength : 2,
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
    }
  },

  initialize : function(input,container,options) {
    this.setInput(document.id(input));
    this.setContainer(document.id(container));
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
    this.getContainer().set(this.options.containerOptions);
  },

  setupEvents : function() {
    var events = {};
    events['focus'] = this.onFocus;
    events['blur'] = this.onBlur;
    events['keydown'] = this.onInput;
    events['keydown:pause('+this.options.keyInputDelay+')'] = this.search;
    this.getInput().addEvents(events);
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
    }
    return this.requester;
  },

  search : function(data) {
    data = data && typeOf(data) == 'string' ? data : this.getSearchString();
    if(data.length > this.options.minSearchLength) {
      this.getRequester().setOptions({
        url : this.getURL(data),
        method : this.getMethod() || 'GET'
      }).send();
    }
  },

  onInput : function(event) {
    switch(event.key) {
      case 'esc':
        this.onEscape();
      break;
      case 'enter':
        this.onEnter();
      break;
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

  onNoResults : function() {
    this.fireEvent('noResults');
    this.clearResults();
  },

  onRequest : function() {
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
    this.getContainer().set('html',html);
    this.updateLoading();
    this.fireEvent('results');
    this.fireEvent('afterResults');
    this.onComplete();
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
