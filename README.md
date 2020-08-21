# func-html

It's simple html/xml functional tempate system. Simple example:

```
const h = require('func-html');

const template = h('html', 
  h('body', 
    h('h1', 'Hello world!')
  )
);

console.log(template());
// Will out: <html><body><h1>Hello World!</h1></body></html>

```

More complex... As you can see h function returns function... so, we can do like this:

```
const h = require('func-html');
const context = { message: 'Hello world!' };
const template = h('html', 
  h('body', 
    h('h1', (context) => context.message)
  )
);

console.log(template(context));
// Will out: <html><body><h1>Hello World</h1></body></html>

```

And, with attributes
```
const h = require('func-html');
const context = { message: 'Hello world!' };
const getter = (context) => context.message;
const template = h('html', 
  h('body', 
    h('h1', getter, { title: getter })
  )
);

console.log(template(context));
// Will out: <html><body><h1 title="Hello world!">Hello World</h1></body></html>

```

