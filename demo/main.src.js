import { ClassyPreset, DraggableList, WC } from "../index.js";

function startDemo() {
  let oldPos = document.getElementById('old-pos');
  let newPos = document.getElementById('new-pos');
  globalThis.demoList = new DraggableList('ul', ClassyPreset, 
  {
    dragOverClass: 'over',

    onDrop(ev) {
      oldPos.value = ev.oldpos;
      newPos.value = ev.newpos;
      console.debug('onDrop', { ev, list: this });
    },

  });

  console.log('Demo started', demoList.makeDraggable());

}

WC.whenReady(startDemo);
