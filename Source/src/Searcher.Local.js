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
