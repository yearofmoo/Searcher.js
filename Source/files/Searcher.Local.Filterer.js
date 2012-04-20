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
