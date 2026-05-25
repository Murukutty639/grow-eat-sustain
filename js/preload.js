/*
======================================================
MOTION PRELOAD HELPER
======================================================

This small external script runs before the main animation file.
It briefly adds `motion-preload` to the HTML element so animated elements do
not flash in the wrong position while CSS and JavaScript are loading.
*/

document.documentElement.classList.add('motion-preload');

window.setTimeout(function () {
  document.documentElement.classList.remove('motion-preload');
}, 1500);
