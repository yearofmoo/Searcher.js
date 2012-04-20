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
