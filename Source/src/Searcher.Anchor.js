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
