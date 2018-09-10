Object.assign(THREE.Mesh.prototype,
{
    didCrossGrid: function(cellWidth, cellHeight)
    {
        let f = Math.floor;
        let px = f(this.previousPosition.x / cellWidth + 0.5);
        let py = f(this.previousPosition.y / cellHeight + 0.5);
        let cx = f(this.position.x / cellWidth + 0.5);
        let cy = f(this.position.y / cellHeight + 0.5);

        return (px != cx || py != cy);
    },

    isAlignedToGrid: function(cellWidth, cellHeight)
    {
        let p = this.position
        return ((p.x - cellWidth / 2) % cellWidth == 0 &&
            (p.y - cellHeight / 2) % cellHeight == 0);
    },

    wasAlignedToGrid: function(cellWidth, cellHeight)
    {
        let p = this.previousPosition
        return ((p.x - cellWidth / 2) % cellWidth == 0 &&
            (p.y - cellHeight / 2) % cellHeight == 0);
    },

    alignToGrid: function(cellWidth, cellHeight)
    {
        let p = this.position;
        p.x = (Math.floor(p.x / cellWidth) + 0.5) * cellWidth;
        p.y = (Math.floor(p.y / cellHeight) + 0.5) * cellHeight;
    }
});