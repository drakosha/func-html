const assert = require('assert');
const h = require('..');
const { G } = require('@snooty/utils');

describe('HTML Builder', function () {
  describe('tag builder', function () {
    it('should return return plain tag if no attrs and content specified', function () {
      assert.equal(h('div')(), '<div></div>');
    });

    it('should add id attr passed by # in tag description', function () {
      assert.equal(h('div#test')(), '<div id="test"></div>');
    });

    it('should add class attr passed by . in tag description', function () {
      assert.equal(h('div.class1.class2')(), '<div class="class1 class2"></div>');
    });

    it('should add class attr passed by class property', function () {
      assert.equal(h('div.class1', { class: 'class2' })(), '<div class="class1 class2"></div>');
    });

    it('should add class attr passed by class property as functional hash', function () {
      assert.equal(h('div.class1', { class: { 'class2': true } })(), '<div class="class1 class2"></div>');
      assert.equal(h('div.class1', { class: { 'class2': G('bla') } })({ bla: true }), '<div class="class1 class2"></div>');
    });

    it('should add attrs passed by hash ', function () {
      assert.equal(h('div', { test: 'bla' })(), '<div test="bla"></div>');
    });

    it('should attrs compute functions in attributes', function () {
      assert.equal(h('div', { test: G('test') })({ test: 'bla' }), '<div test="bla"></div>');
    });

    it('should avoid attrs with "undefined" values', function () {
      assert.equal(h('div', { test: undefined, t: '1' })({ test: 'bla' }), '<div t="1"></div>');
    });

    it('should treat nulls as empty strings', function() {
      const empty = { id: null, name: null };
      assert.equal(h('option', { value: G('id') }, G('name'))(empty), '<option value=""></option>');
    });

    it('should render boolean attributes if value is true', function () {
      assert.equal(h('div', { readonly: true } )(), '<div readonly></div>');
      assert.equal(h('div', { readonly: G('readonly') } )({ readonly: true }), '<div readonly></div>');
    });

    it('should not render boolean attributes without value', function () {
      assert.equal(h('div', { readonly: G('readonly') } )({ readonly: false }), '<div></div>');
    });

    it('should not render boolean attributes with null value', function () {
      assert.equal(h('div', { readonly: G('readonly') } )({ readonly: null }), '<div></div>');
    });

    it('should render strings inside content', function () {
      assert.equal(h('div', 'test1', 'test2')(), '<div>test1test2</div>');
    });

    it('should render embeded function with context', function () {
      assert.equal(h('div', G('test'))({ test: 'bla' }), '<div>bla</div>');
      assert.equal(h('div', h('span', G('test')))({ test: 'bla' }), '<div><span>bla</span></div>');
    });

    it('should override id from attrs', function () {
      assert.equal(h('div#old', { id: 'new' })(), '<div id="new"></div>');
    });

    it('should render objects in attributes', function () {
      assert.equal(h('div', { data: { id: G('id') } })({ id: 1 }), '<div data="{&quot;id&quot;:1}"></div>');
    });

    it('should render deep objects in attributes', function () {
      assert.equal(h('div', { data: { data: { id: G('id') } } })({ id: 1 }), '<div data="{&quot;data&quot;:{&quot;id&quot;:1}}"></div>');
      assert.equal(h('div', { data: { list: [1, 2, 3] } })(), '<div data="{&quot;list&quot;:[1,2,3]}"></div>');
    });

    it('should escape html strings', function () {
      assert.equal(h('div', h('span', '&&'))(), '<div><span>&amp;&amp;</span></div>');
      assert.equal(h('div', h('span', G('bla')))({ bla: '&&' }), '<div><span>&amp;&amp;</span></div>');
    });

    it('should escape attributes', function () {
      assert.equal(h('div', { text: '&&' } )(), '<div text="&amp;&amp;"></div>');
    });

    it('should accept null from function output', function() {
      assert.equal(h('div', () => null)(), '<div></div>');
    });

    it('should ignore falsey values', function() {
      assert.equal(h('div', true && { class: 'success' })(), '<div class="success"></div>');
      assert.equal(h('div', false && { class: 'failed' })(), '<div></div>');
    });

    it('should safely work with dates', function() {
      const utcDate = (...args) => new Date(Date.UTC(...args));
      assert.equal(h('div', utcDate(2020,0,1))(), '<div>2020-01-01T00:00:00.000Z</div>');
      assert.equal(h('div', G('date'))({ date: utcDate(2020,0,1) }), '<div>2020-01-01T00:00:00.000Z</div>');
    });
  });

  describe('h.safe', function () {
    it('should disable escaping', function () {
      assert.equal(h('div', h.safe('&&'))(), '<div>&&</div>');
      assert.equal(h('div', h.safe(h('span', G('bla'), '&'), '&'))({ bla: '&&' }), '<div><span>&&&</span>&</div>');
    });
  });

  describe('h.each', function () {
    before(function () {
      this.context = {
        rootValue: 'bla1',
        collection: [
          { val: 'test1'},
          { val: 'test2', internal: [{ val: 'test3' }] }
        ]
      };
    });
    it('should iterate in collecition', function () {
      assert.equal(
        h('div',
          h.each('collection', h('a', G('entry.val')), h('span'))
        )(this.context),
        '<div><a>test1</a><span></span><a>test2</a><span></span></div>'
      );
    });

    it('should preserve parent', function () {
      assert.equal(
        h('div',
          h.each('collection', h('a', G('entry.val'), G('parent.rootValue')))
        )(this.context),
        '<div><a>test1bla1</a><a>test2bla1</a></div>'
      );
    });

    it('should preserve root context on all levels', function () {
      assert.equal(
        h('div',
          h.each('collection',
            h('a', h.each('entry.internal',
              h('i', G('entry.val'), G('$root.rootValue'))
            ))
          )
        )(this.context),
        '<div><a></a><a><i>test3bla1</i></a></div>'
      );
    });
  });

  describe('h.group', function () {
    it('should just render and concat arguments', function () {
      assert.equal(
        h.group(h('div', 'test1'), h('div', 'test2'))(),
        '<div>test1</div><div>test2</div>'
      );
    });
  });

  describe('h.if', function () {
    it('should render second or third argiment accordind first argument result', function() {
      assert.equal(h.if(G('bla'), h('div'), h('span'))({ bla: true }), '<div></div>');
      assert.equal(h.if(G('bla'), h('div'), h('span'))({ bla: false }), '<span></span>');
    });

    it('should use when wrapper if first argument is object', function() {
      assert.equal(h.if({ bla: 55 }, h('div'), h('span'))({ bla: 55 }), '<div></div>');
      assert.equal(h.if({ bla: 56 }, h('div'), h('span'))({ bla: 55 }), '<span></span>');
    });
  });

  describe('h.within', function () {
    before(function () {
      this.context = {
        rootValue: 'bla1',
        collection: [
          { val: 'test1'},
          { val: 'test2', internal: [{ val: 'test3' }] }
        ]
      };
    });
    it('should shift context', function () {
      assert.equal(
        h('div',
          h.each('collection', h.within('entry', h('a', G('val')), h('span')))
        )(this.context),
        '<div><a>test1</a><span></span><a>test2</a><span></span></div>'
      );
    });

    it('should preserve original context in $parent', function() {
      const template = h.within('collection', G('$parent.rootValue'));

      assert.equal(template(this.context), 'bla1');
    });

    it('should preserve root context in $root', function() {
      const template = h.within('collection.1',
        h.within('internal', G('$root.rootValue'))
      );

      assert.equal(template(this.context), 'bla1');
    });
  });
});
