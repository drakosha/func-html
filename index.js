const { mapKeys, forEachKey, ensureFn } = require('func-helpers');

function escape(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;');
}

function html(tagDescription, ...data) {
  let [tagWithID, ...classes] = tagDescription.split('.');
  let [tag, id] = tagWithID.split('#');
  const content = [];
  const attrs = {};
  let fixedClasses = undefined;

  if (id) attrs.id = id;
  if (classes && classes.length) fixedClasses = classes.join(' ');

  for (const entity of data) {
    switch (typeof entity) {
      case 'function':
      case 'string':
        content.push(entity);
        break;
      case 'object':
        forEachKey(entity, (key, val) => attrs[key] = val);
        break;
      default:
        throw new Error(`Unsupported parameter of type ${typeof entity}`);
    }
  }

  if (!('class' in attrs) && fixedClasses) attrs.class = '';

  return withBuffer((context, buffer, escaped) => {

    const renderedAttrs = mapKeys(attrs, (id, content) => {
      let rendered;

      if (id === 'class')
        rendered = classRender(fixedClasses, content, context);
      else
        rendered = typeof content === 'function' ? content(context) : content;

      return `${id}="${escaped ? rendered : escape(rendered)}"`;
    }).join(' ');

    buffer.push(`<${tag}${renderedAttrs.length ? ' ' : ''}${renderedAttrs}>`);
    content.forEach(entity => render(entity, context, buffer, escaped));
    buffer.push(`</${tag}>`);
  });
}

function withBuffer(fn) {
  return (context, _buffer, escaped) => {
    const buffer = _buffer || [];

    fn.call(null, context, buffer, escaped);

    return _buffer === undefined ? buffer.join('') : '';
  };
}

function render(entity, context, buffer, escaped) {
  switch (typeof entity) {
    case 'function':
      render(entity(context, buffer, escaped), context, buffer, escaped);
      break;
    case 'string':
      if (entity === '') break;
      buffer.push(escaped ? entity : escape(entity));
      break;
    case 'number':
      buffer.push(entity.toString());
      break;
    case 'object':
      for (const obj of entity){
        render(obj, context, buffer, escaped);
      }
      break;
  }
}

html.each = (collectionGetter, ...content) => {
  const getter = ensureFn(collectionGetter);

  return withBuffer((context, buffer, escaped) => {
    const collection = getter(context);

    if (!collection) return;

    collection.forEach((entry, index) =>
      render(content, {
        entry,
        index,
        parent: context,
        '$root': context['$root'] || context
      }, buffer, escaped));
  });
};

html.group = (...content) => {
  return withBuffer((context, buffer, escaped) => {
    content.forEach((entity) =>
      render(entity, context, buffer, escaped));
  });
};

html.safe = (...content) => {
  return withBuffer((context, buffer) =>
    render(content, context, buffer, true));
};

html.if = (conditionGetter, ifTrue, ifFalse) => {
  const condition = ensureFn(conditionGetter);

  return withBuffer((context, buffer, escaped) => {
    const result = condition(context);

    render(result ? ifTrue : ifFalse, context, buffer, escaped);
  });
};

function classRender(fixed, value, context) {
  const classes = fixed ? [fixed] : [];

  switch (typeof value) {
    case 'function':
      classes.push(value(context));
      break;
    case 'string': // FIXME: strange....
      if (value !== '') classes.push(value);
      break;
    case 'object':
      forEachKey(value, (name, toggler) => {
        let toggle = false;

        if (typeof toggler === 'function') toggle = !!toggler(context);
        else toggle = !!toggler;

        if (toggle) classes.push(name);
      });
      break;
  }

  return classes.length ? classes.join(' ') : '';
}

module.exports = html;
