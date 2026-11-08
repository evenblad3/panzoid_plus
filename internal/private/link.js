( function () {
    "use strict";

    const links = {
        youtube_button: "https://www.youtube.com/@WzrterFX?sub_confirmation=1",
        github_button: "https://github.com/WzrterFX",

        review_button: "https://chromewebstore.google.com/detail"
            + "/ehnkcfogapldjdcahfdhnfpddedeefpi/reviews"
    };

    Object.keys( links ).forEach( function ( name ) {
        const button = document.getElementById( name );
        if( !button ) return;

        button.addEventListener( "click", function () {
            window.open( links[ name ], "_blank", "noopener" );
        } );
    } );
} )();
