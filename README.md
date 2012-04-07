# Seacher.js

This library includes **seven** classes:

- Searcher
- Searcher.AutoComplete
- Searcher.Local
- Searcher.AutoComplete.Local
- Searcher.Local.Filterer
- Searcher.AutoComplete.Local.Filterer
- Searcher.Local.Spotlight

## Requirements

- MooTools Core 1.3+
- MooTools More (Binds)
- MooTools-Class.Accessor
- MooTools-Event.outerClick

## Browser Support

Works in all browsers

## Usage

### Searcher.AutoComplete
```html
<input type="text" id="searcher" />
<script type="text/javascript">
window.addEvent('domready',function() {
  new Searcher.AutoComplete('searcher',{
    url : '...',
    method : '...'
    onResults : function(results) {

    }
  });
});
</script>
```
