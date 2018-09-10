const Keyboard = (function()
{
    const Key = Object.freeze(
    {
        A: 65,
        B: 66,
        D: 68,
        F: 70,
        L: 76,
        R: 82,
        S: 83,
        U: 85,
        W: 87,
        Q: 81,
        Space: 32,
        Enter: 13,
        Tab: 9,
        Escape: 27,
        LeftArrow: 37,
        UpArrow: 38,
        RightArrow: 39,
        DownArrow: 40
    });

    let pressedSet = new Set();
    let downSet = new Set();

    window.addEventListener('keyup', (e) =>
    {
        downSet.delete(e.keyCode);
    });

    window.addEventListener('keydown', (e) =>
    {
        if (!downSet.has(e.keyCode))
        {
            pressedSet.add(e.keyCode);
        }

        downSet.add(e.keyCode);
    });

    /** @param {Key} key */
    function isPressed(key)
    {
        return pressedSet.has(key);
    }

    /** @param {Key} key */
    function isDown(key)
    {
        return downSet.has(key);
    }

    function update()
    {
        pressedSet.clear();
    }

    let Keyboard =
    {
        Key: Key,
        isPressed: isPressed,
        isDown: isDown,
        update: update
    };

    return Object.freeze(Keyboard);

})();

// window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
// window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);


// var Key = {
//   _down: {},
//   _pressed: {},

//   A: 65,
//   B: 66,
//   D: 68,
//   F: 70,
//   L: 76,
//   R: 82,
//   S: 83,
//   U: 85,
//   W: 87,
// 	Q: 81,

//   SPACE: 32,
	
// 	TAB: 9,
// 	ESCAPE: 27,

//   LEFTARROW: 37,
//   UPARROW: 38,
//   RIGHTARROW: 39,
//   DOWNARROW: 40,
  
//   isDown: function(keyCode)
//   {
//     return this._down[keyCode];
//   },

//   isPressed: function(keyCode)
//   {
//     return this._pressed[keyCode];
//   },
  
//   onKeydown: function(event)
//   {
//     let keyCode = event.keyCode;
//     this._pressed[keyCode] = (!this._down[keyCode]);
//     this._down[keyCode] = true;
//   },
  
//   onKeyup: function(event)
//   {
//     this._pressed[event.keyCode] = false;
//     this._down[event.keyCode] = false;
//   }
// };