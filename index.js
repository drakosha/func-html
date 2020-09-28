const { mapKeys, forEachKey, ensureFn, when } = require('@snooty/utils');

const BOOLEAN_ATTRIBUTES = [
  'hidden',
  'checked',
  'required',
  'readonly',
  'selected',
  'disabled'
];

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
      else {
        rendered = renderWith(content, context);
        if (typeof rendered === 'object') {
          forEachKey(rendered, (key, val) => {
            rendered[key] = renderWith(val, context);
          });
          rendered = JSON.stringify(rendered)
        };
      }

      const value = escaped ? rendered : escape(rendered);

      if (BOOLEAN_ATTRIBUTES.includes(id)) {
        return rendered ? id : undefined;
      } else {
        return rendered !== undefined ? `${id}="${value}"` : rendered;
      }
    }).filter(v => v !== undefined).join(' ');

    buffer.push(`<${tag}${renderedAttrs.length ? ' ' : ''}${renderedAttrs}>`);
    content.forEach(entity => render(entity, context, buffer, escaped));
    buffer.push(`</${tag}>`);
  });
}

function renderWith(content, context) {
  return typeof content === 'function' ? content(context) : content;
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

html.within = (contextGetter, ...content) => {
  const getter = ensureFn(contextGetter);

  return withBuffer((context, buffer, escaped) => {
    const shiftedContext = getter(context);

    content.forEach((entry, index) =>
      render(entry, shiftedContext, buffer, escaped));
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
  const condition = typeof conditionGetter === 'object'
    ? when(conditionGetter)
    : ensureFn(conditionGetter);

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
