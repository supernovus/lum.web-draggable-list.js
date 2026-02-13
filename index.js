/**
 * @module @lumjs/web-draggable-list
 */
import { enableDragDropTouch } from '@dragdroptouch/drag-drop-touch';
import WC from '@lumjs/web-core';
import core from '@lumjs/core';

export { enableDragDropTouch, WC };
export const { indexOf, on } = WC.ez;

const { isObj } = core.types;

const DEF_OPTS = {
  autoRegister: null,
  delegated: true,
  enableTouch: true,
  itemMatch: 'li',
  itemSelector: '& > li',
  onDrop() {},
  onEnd() {},
  onEnter() {},
  onLeave() {},
  onOver() {},
  onStart() {},
  verbose: false,
}

const DRAG_METHODS = [
  'handleDragStart',
  'handleDragEnter',
  'handleDragOver',
  'handleDragLeave',
  'handleDrop',
  'handleDragEnd',
]

/**
 * A class for making it so you can move list items using
 * drag and drop. Includes touch support by default.
 */
export class DraggableList {
  /**
   * Build a DraggableList instance.
   * 
   * @param {(string|Element)} listElem - Parent element for the list.
   * 
   * Usually this should be the container (e.g. `<ul>`) that is the direct
   * parent of the list items, and most of the option defaults expect that.
   * 
   * If you use an element above the container here (say for instance if you
   * have multiple lists that you want to be controlled by the same
   * DraggableList instance for reasons left to your own devices), you will
   * need to adjust at least `opts.itemSelector` to reflect that.
   * 
   * If this is a string, it will be used as a query selector on the top-level
   * document to find the desired element.
   * 
   * @param {object} [opts] Options.
   * 
   * You may specify this argument more than once. If the same options are
   * set in multiple opts arguments, the ones specified last will be used.
   * This design was mostly just to make *presets* easier to use.
   * 
   * In addition to the options listed here, some presets may add their own.
   * 
   * @param {?boolean} [opts.autoRegister=null] Register items automatically?
   * 
   * If this is true then makeDraggable() will be called with no arguments
   * at the very end of the constructor. If this is false, it is left up to
   * you to call it explicitly (if its needed at all) from your app's code.
   * 
   * If this is null (the default value), then its value will be determined
   * using: `!opts.delegated`; which I think is a decent default.
   * 
   * @param {boolean} [opts.delegated=true] Use delegated events?
   * 
   * If this is true (the default), then the event listeners will be
   * registered on the `listElem` using delegation to dispatch to the
   * appropriate item elements.
   * 
   * @param {boolean} [opts.enableTouch=true] Enable Touch compatibility?
   * 
   * If this is true (the default), then we will call enableDragDropTouch(),
   * passing the `listElem` as the first two arguments, and `opts` as the last.
   * 
   * See https://github.com/drag-drop-touch-js/dragdroptouch for details on
   * that function. Any of its options may be specified in `opts` as well.
   * 
   * If you have custom requirements of any kind, you can set this to
   * false and you'll be responsible for setting up DragDropTouch yourself.
   * 
   * @param {string} [opts.itemMatch='li'] Delegation selector for items.
   * 
   * This will be used to find matching list items using `element.match()`.
   * The default `'li'` assumes you are using a <ul>, <ol>, or <menu> for
   * your list container element.
   * 
   * @param {string} [opts.itemSelector='& > li'] Selector to find list items.
   * 
   * This is only ever used by the `listItems` accessor property to find
   * list items using `listElem.querySelectorAll(opts.itemSelector)`.
   * 
   * The only time this would be used by the class itself is if you
   * call makeDraggable() without specifying any elements manually,
   * which is the case if `opts.autoRegister` was enabled.
   * 
   * The default `'& > li'` only matches <li> elements that are *direct*
   * children of the listElem itself. So if that is not the case, you will
   * need to adjust this option.
   * 
   * @param {DropEventHandler} [opts.onDrop] Handler for `drop` events.
   * 
   * The DragEvent object passed to this handler has two extra properties
   * added; one representing the original position of the dragged element,
   * and another for the position it was moved to after dropping it.
   * 
   * Of all the handlers, this one is the one you'll likely want to define
   * yourself and do something with.
   * 
   * @param {DragEventHandler} [opts.onEnd] Handler for `dragend` events.
   * @param {DragEventHandler} [opts.onEnter] Handler for `dragenter` events.
   * @param {DragEventHandler} [opts.onLeave] Handler for `dragleave` events.
   * @param {DragEventHandler} [opts.onOver] Handler for `dragover` events.
   * @param {DragEventHandler} [opts.onStart] Handler for `dragstart` events.
   * @param {boolean} [opts.verbose=true] Enable verbose debugging info.
   */
  constructor(listElem, ...opts) {
    this.opts = opts = Object.assign({}, DEF_OPTS, ...opts);
    if (typeof listElem === 'string') {
      listElem = document.querySelector(listElem);
    }

    if (!(listElem instanceof Element)) {
      throw new TypeError("invalid Element");
    }

    this.listElem = listElem;
    this.dragging = null;
    this.registration = new Map();

    if (opts.enableTouch) {
      enableDragDropTouch(listElem, listElem, opts);
    }

    if (opts.delegated) { // Delegated event registration is the best IMHO!
      this.registerDelegation();
    }

    if (opts.autoRegister ?? !opts.delegated) {
      this.makeDraggable();
    }
  }

  /**
   * Accessor to get a NodeList containing the list items.
   */
  get listItems() {
    return this.listElem.querySelectorAll(this.opts.itemSelector);
  }

  /**
   * The method used to register delegated event listeners.
   * 
   * You shouldn't normally have to call this manually, however
   * you can use it to remove the delegated event listeners if you
   * want to disable the drag and drop code for some reason, you
   * can use this to do so.
   * 
   * @param {boolean} [enabled=true] Enable delegated events?
   * 
   * If true the events will be registered. If false, they will
   * be removed. You can use this to toggle draggability on and off.
   * 
   * @returns {DraggableList} this instance.
   */
  registerDelegation(enabled=true) {
    let elem = this.listElem;
    let opts = this.opts;
    let registry = this.registration.get(elem) ?? {};

    for (let meth of DRAG_METHODS)
    {
      let eventName = meth.replace('handle','').toLowerCase();

      if (isObj(registry[eventName])) { 
        // Unregister an existing event handler.
        registry[eventName].off();
        delete registry[eventName];
      }

      if (enabled) {
        registry[eventName] = on(elem, eventName, opts.itemMatch, ev => {
          if (opts.verbose) { 
            console.debug('delegated', 
              {eventName, meth, event: ev, opts, list: this});
          }
          this[meth](ev);
        }, {off: true});
      }
    }

    this.registration.set(elem, registry);

    return this;
  }

  /**
   * Make one or more items draggable.
   * 
   * If you are using event delegation and your item elements already have the
   * `draggable` attribute set, you shouldn't have to call this at all.
   * 
   * If you are **NOT** using delegation this method will have to be called
   * for every item you want to be able to be dragged!
   * 
   * @param {boolean} [enabled=true] Make the items draggable?
   * 
   * The string of this value will be used to set the `draggable` attribute
   * on each of the items.
   * 
   * If `this.opts.delegated` is false then this argument will determine
   * if direct event handlers should be added or removed from each item.
   * 
   * @param {...(Element|string)} [elems] Item elements to register.
   * 
   * This can be used if you are adding dynamic items.
   * 
   * If you don't pass any arguments here then `this.listItems` will be
   * used to find the items elements.
   * 
   * @returns {DraggableList} this instance.
   */
  makeDraggable(enabled=true, ...elems) {
    if (elems.length === 0) {
      elems = this.listItems;
    }

    let delegated = this.opts.delegated;
    let verbose = this.opts.verbose;

    for (let elem of elems) {
      if (typeof elem === 'string') {
        elem = this.listElem.querySelector(elem);
      }

      if (!(elem instanceof Element)) {
        throw new TypeError("invalid Element");
      }

      elem.setAttribute('draggable', enabled.toString());

      if (!delegated) {
        let registry = this.registration.get(elem) ?? {};

        for (let meth of DRAG_METHODS)
        {
          let eventName = meth.replace('handle','').toLowerCase();

          if (isObj(registry[eventName])) { 
            // Unregister an existing event handler.
            registry[eventName].off();
            delete registry[eventName];
          }

          if (enabled) { // Register an event handler.
            registry[eventName] = on(elem, eventName, ev => {
              if (verbose) { 
                console.debug('direct', 
                  {eventName, meth, event: ev, elem, list: this});
              }
              this[meth](ev);
            }, {off: true});
          }
        }
        this.registration.set(elem, registry);
      }

    }

    return this;
  }

  handleDragStart(ev) {
    this.dragging = ev.target;
    ev.dataTransfer.effectAllowed = 'move';
    this.opts.onStart.call(this, ev);
  }

  handleDragOver(ev) {
    if (this.dragging) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      this.opts.onOver.call(this, ev);
    }
  }

  handleDragEnter(ev) {
    if (this.dragging) {
      this.opts.onEnter.call(this, ev);
    }
  }

  handleDragLeave(ev) {
    if (this.dragging) {
      this.opts.onLeave.call(this, ev);
    }
  }

  handleDragEnd(ev) {
    this.opts.onEnd.call(this, ev);
    this.dragging = null;
  }

  handleDrop(ev) {
    if (this.dragging === null) return;

    ev.stopPropagation();
    ev.stopImmediatePropagation();
    ev.preventDefault();

    let {target} = ev;
    let dragged = this.dragging;

    if (dragged !== target) {
      let ia = indexOf(dragged);
      let ib = indexOf(target);

      if (ia > ib) {
        target.before(dragged);
      }
      else {
        target.after(dragged);
      }

      Object.assign(ev, { oldpos: ia, newpos: ib });

      this.opts.onDrop.call(this, ev);
    }
  }

}

export default DraggableList;

/**
 * A Preset that adds a CSS class to list items when another items is being
 * dragged over it. It provides `onEnter`, `onLeave`, and `onEnd` handlers.
 * 
 * To set the CSS class, it adds an extra option called `dragOverClass`, 
 * which is a string, and defaults to `'drag-over'`.
 * 
 * If you want to use a Preset but also add your own functionality, 
 * you can chain handlers by using the call() method. For example:
 * 
 * ```js
 * import {DraggableList, ClassyPreset} from '@lumjs/web-draggable-list';
 * 
 * let dlist = new DraggableList('#my-list', ClassyPreset, {
 *   dragOverClass: 'drop-target',
 *   onEnter(event) {
 *     // Run stuff before calling the preset onEnter.
 *     ClassyPreset.onEnter.call(this, event);
 *     // Run more stuff after the preset onEnter.
 *   },
 * });
 * ```
 *
 */
export const ClassyPreset = {
  dragOverClass: 'drag-over',
  onStart() {
    this.entered = 0;
  },
  onEnter(ev) {
    if (!this.entered++) {
      ev.target.classList.add(this.opts.dragOverClass);
    }
  },
  onLeave(ev) {
    if (!--this.entered) {
      ev.target.classList.remove(this.opts.dragOverClass);
    }
  },
  onEnd() {
    let doclass = this.opts.dragOverClass;
    this.listItems.forEach(item => item.classList.remove(doclass));
  },
}

/**
 * A Drag Event handler
 * @callback DragEventHandler
 * @param {DragEvent} event - The event being handled.
 * @this {DraggableList}
 */

/**
 * A Drop Event handler.
 * @callback DropEventHandler
 * @param {DragEvent} event - The event being handled; with extra metadata.
 * @param {number} event.oldpos - The original position of the dragged item.
 * @param {number} event.newpso - The new position of the dragged item.
 * @this {DraggableList}
 */
