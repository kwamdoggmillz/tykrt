$(document).ready(function () {
    const container = $('.container')[0].getBoundingClientRect();

    $('.box').draggable({
        containment: '.container',
        scroll: false,
        stack: '.box',
        stop: function (event, ui) {
            handleCollisions($(this));
        }
    }).resizable({
        containment: '.container',
        minHeight: 50,
        minWidth: 50,
        stop: function (event, ui) {
            handleCollisions($(this));
        }
    });

    function handleCollisions($box) {
        const boxRect = $box[0].getBoundingClientRect();
        const boxes = $('.box').not($box);

        boxes.each(function () {
            const otherRect = this.getBoundingClientRect();

            if (
                boxRect.right > otherRect.left &&
                boxRect.left < otherRect.right &&
                boxRect.bottom > otherRect.top &&
                boxRect.top < otherRect.bottom
            ) {

                const collisionLeft = boxRect.right - otherRect.left;
                const collisionRight = otherRect.right - boxRect.left;
                const collisionTop = boxRect.bottom - otherRect.top;
                const collisionBottom = otherRect.bottom - boxRect.top;

                const minCollision = Math.min(
                    collisionLeft, collisionRight, collisionTop, collisionBottom
                );

                if (minCollision === collisionLeft && (otherRect.left - collisionLeft) > container.left) {
                    $box.css('left', parseInt($box.css('left')) - collisionLeft + 'px');
                } else if (minCollision === collisionRight && (otherRect.right + collisionRight) < container.right) {
                    $box.css('left', parseInt($box.css('left')) + collisionRight + 'px');
                } else if (minCollision === collisionTop && (otherRect.top - collisionTop) > container.top) {
                    $box.css('top', parseInt($box.css('top')) - collisionTop + 'px');
                } else if (minCollision === collisionBottom && (otherRect.bottom + collisionBottom) < container.bottom) {
                    $box.css('top', parseInt($box.css('top')) + collisionBottom + 'px');
                }
            }
        });
    }
});