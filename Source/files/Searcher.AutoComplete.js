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
