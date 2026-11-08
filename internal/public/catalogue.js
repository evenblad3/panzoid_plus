window.extension = window.extension || {};

extension.catalogue = {
    paths( catalogue ) {
        return [ "blobs/library.effect" ].concat( catalogue.map( function ( effect ) {
            return "blobs/effects/" + effect.internal;
        } ) );
    },

    async read_all( read ) {
        const catalogue = JSON.parse( await read( "blobs/effects.json" ) );
        const paths = extension.catalogue.paths( catalogue );
        const texts = await Promise.all( paths.map( read ) );

        const sources = {};
        paths.slice( 1 ).forEach( function ( path, it ) {
            sources[ path.replace( "blobs/effects/", "" ) ] = texts[ it + 1 ];
        } );

        return { catalogue, library: texts[ 0 ], sources };
    },

    install( parts ) {
        extension.effect.use( parts.catalogue, parts.library, parts.sources );
    }
};
