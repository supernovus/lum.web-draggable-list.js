import { enableDragDropTouch } from '@dragdroptouch/drag-drop-touch';
import WC from '@lumjs/web-core';

export {WC};
export const { indexOf, on } = WC.ez;

const DEF_OPTS = {
  delegated: true,
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

export class DraggableList {
  constructor(listElem, opts) {
    this.opts = opts = Object.assign({}, DEF_OPTS, opts);
    if (typeof listElem === 'string') {
      listElem = document.querySelector(listElem);
    }

    if (!(listElem instanceof Element)) {
      throw new TypeError("invalid Element");
    }

    this.listElem = listElem;
    this.dragging = null;
    enableDragDropTouch(listElem, listElem, opts);

    if (opts.delegated) {
      for (let meth of DRAG_METHODS)
      {
        let eventName = meth.replace('handle','').toLowerCase();
        on(listElem, eventName, opts.itemMatch, ev => {
          if (opts.verbose) { 
            console.debug('delegated', {eventName, meth, event: ev, opts, list: this});
          }
          this[meth](ev);
        });
      }
    }
  }

  get listItems() {
    return this.listElem.querySelectorAll(this.opts.itemSelector);
  }

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
        for (let meth of DRAG_METHODS)
        {
          let eventName = meth.replace('handle','').toLowerCase();
          on(elem, eventName, ev => {
            if (verbose) { 
              console.debug('direct', {eventName, meth, event: ev, elem, list: this});
            }
            this[meth](ev);
          });
        }
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
 * A Drag Event handler
 * @callback DragEventHandler
 * @param {DragEvent} event - The event being handled.
 */

/**
 * A Drop Event handler.
 * @callback DropEventHandler
 * @param {DragEvent} event - The event being handled; with extra metadata.
 * @param {number} event.oldpos - The original position of the dragged item.
 * @param {number} event.newpso - The new position of the dragged item.
 */
