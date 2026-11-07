document.addEventListener( "DOMContentLoaded", function () {
    const tab_names = [ "effects", "tweaks", "inspect", "readme" ];

    function show_tab( open_name ) {
        tab_names.forEach( function ( name ) {
            document.getElementById( "tab_" + name ).classList.toggle( "rail_on", name === open_name );
            document.getElementById( "pane_" + name ).classList.toggle( "pane_off", name !== open_name );
        } );

        localStorage.setItem( "tab", open_name );
    }

    tab_names.forEach( function ( name ) {
        document.getElementById( "tab_" + name ).addEventListener( "click", function () {
            show_tab( name );
        } );
    } );

    const saved_name = localStorage.getItem( "tab" );
    show_tab( tab_names.includes( saved_name ) ? saved_name : tab_names[ 0 ] );
} );
