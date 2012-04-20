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
