class Misc
{
    /**
    * @param {THREE.Texture} texture 
    */
    static extractImageData(texture)
    {
        let image = texture.image;
        
        let canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
    
        let context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
    
        return context.getImageData(0, 0, image.width, image.height);
    }
}

class HTML
{
    static appendText(parent, text, ...classes)
    {
        let element = document.createElement("text");
        element.textContent = text;
        
        for (let c of classes)
        {
            element.classList.add(c);
        }

        parent.appendChild(element);
    }

    static appendBreak(parent)
    {
        parent.appendChild(document.createElement("br"));
    }

    static appendTextLine(parent, text, ...classes)
    {
        HTML.appendText(parent, text, ...classes);
        HTML.appendBreak(parent);
    }
}