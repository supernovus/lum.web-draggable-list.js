import { DraggableList, WC } from "../index.js";

function startDemo() {
  let oldPos = document.getElementById('old-pos');
  let newPos = document.getElementById('new-pos');
  globalThis.demoList = new DraggableList('ul', {

    onEnter(ev) {
      ev.target.classList.add('over');
    },

    onLeave(ev) {
      ev.target.classList.remove('over');
    },

    onEnd(ev) {
      this.listItems.forEach(item => item.classList.remove('over'));
    },

    onDrop(ev) {
      oldPos.value = ev.oldpos;
      newPos.value = ev.newpos;
      console.debug('onDrop', { ev, list: this });
    },

  });

  console.log('Demo started', demoList.makeDraggable());

}

WC.whenReady(startDemo);
