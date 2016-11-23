/* Tracker Search Provider for Gnome Shell
 *
 * 2012 Contributors Christian Weber, Felix Schultze, Martyn Russell
 * 2014 Florian Miess
 *
 * This programm is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * Version 1.5
 *
 * https://github.com/cewee/tracker-search
 *
 *
 * Version 1.6
 * https://github.com/hamiller/tracker-search-provider
 *
 */

const Main          = imports.ui.main;
const Clutter       = imports.gi.Clutter;
const Search        = imports.ui.search;
const Gio           = imports.gi.Gio;
const GLib          = imports.gi.GLib;
const IconGrid      = imports.ui.iconGrid;
const Util          = imports.misc.util;
const Tracker       = imports.gi.Tracker;
const St            = imports.gi.St;
const Atk           = imports.gi.Atk;
const Lang          = imports.lang;

/* let xdg-open pick the appropriate program to open/execute the file */
const DEFAULT_EXEC = 'xdg-open';
/* Limit search results, since number of displayed items is limited */
const MAX_RESULTS = 10;
const ICON_SIZE = 64;

const CategoryType = {
    FTS : 0,
    FILES : 1,
    FOLDERS : 2
};

var trackerSearchProviderFiles = null;
var trackerSearchProviderFolders = null;


const TrackerSearchProvider = new Lang.Class({
    Name : 'TrackerSearchProvider',

    _init : function(title, categoryType) {
        this._categoryType = categoryType;
        this._title = title;
        this.id = 'tracker-search-' + title;
        this.appInfo = {get_name : function() {return 'tracker-needle';},
                        get_icon : function() {return Gio.icon_new_for_string("/usr/share/icons/gnome/256x256/actions/system-search.png");},
                        get_id : function() {return this.id;}
        };
        this.resultsMap = new Map();
    },

    _getQuery : function (terms, filetype) {
        var select = 'SELECT'
                        + ' ?urn nie:url(?urn)'
                        + '     tracker:coalesce(nie:title(?urn), nfo:fileName(?urn), "unknown name")'
                        + '     nie:url(?parent)'
                        + '     nfo:fileLastModified(?urn) ';

        var where = '';

        var order = ' ORDER BY'
                        + ' DESC(nfo:fileLastModified(?urn))'
                        + ' ASC(nie:title(?urn)) '
                        + ' DESC(nie:contentCreated(?urn))'
                        + ' OFFSET 0 LIMIT ' + String(MAX_RESULTS);

        if (this._categoryType == CategoryType.FTS) {
            var terms_in_sparql = "";

            for (var i = 0; i < terms.length; i++) {
                if (terms_in_sparql.length > 0) terms_in_sparql += " ";
                terms_in_sparql += terms[i] + "*";
            }

            /* TODO:
             *  Technically, the tag should really be matched
             *  separately not as one phrase too.
             */
            var nfoFileType = filetype ? filetype : 'FileDataObject';

            where = ' WHERE {'
                        + '{ ?urn a nfo:' + nfoFileType + ' .'
                        + ' ?urn fts:match "' + terms_in_sparql + '" }'
                        + ' UNION '
                        + '{ ?urn nao:hasTag ?tag . '
                            + 'FILTER (fn:contains (fn:lower-case (nao:prefLabel(?tag)), "' + terms + '")) }'
                            + ' OPTIONAL {'
                                + ' ?urn nfo:belongsToContainer ?parent .'
                                + ' ?r2 a nfo:Folder .'
                                + ' FILTER(?r2 = ?urn) .} .'

                        + ' FILTER(!BOUND(?r2)) .'
                        + '}';

            /* TODO:
             *  ?r2 a nfo:Folder . FILTER(?r2 = ?urn). } . FILTER(!BOUND(?r2)
             *  is supposed to filter out folders, but this fails for 'root'
             *  folders in which is indexed (as 'Music', 'Documents' and
             *  so on ...) - WHY?
             */

        } else if (this._categoryType == CategoryType.FILES) {
            // TODO: Do we really want this?
        } else if (this._categoryType == CategoryType.FOLDERS) {
            where = ' WHERE {'
                        + ' ?urn a nfo:Folder .'
                        + ' FILTER (fn:contains (fn:lower-case (nfo:fileName(?urn)), "' + terms + '")) .'
                        + ' ?urn nfo:belongsToContainer ?parent ;'
                        + ' tracker:available true .'
                        + '}';
        }

        return select + where + order;
    },

    _getResultMeta : function(resultId) {
        let res = this.resultsMap.get(resultId);
        let type = res.contentType;
        let name = res.name;
        let path = res.path;
        let filename = res.filename;
        let lastMod = res.lastMod;
        let contentType = res.contentType;
        let prettyPath = res.prettyPath;
        return {
            'id':       resultId,
            'name':     name,
            'description' : path + " - " + lastMod,
            'createIcon' : function(size) {
                let icon = Gio.app_info_get_default_for_type(type, null).get_icon();
                return new St.Icon({ gicon: icon, 
                                     icon_size: size });
            }
        };
    },

    getResultMetas: function(resultIds, callback) {
        let metas = [];
        for (let i = 0; i < resultIds.length; i++) {
            metas.push(this._getResultMeta(resultIds[i]));
        }
        callback(metas);
    },

    activateResult : function(result) {
        var uri = String(result);
        // Action executed when clicked on result
        var f = Gio.file_new_for_uri(uri);
        var fileName = f.get_path();
        Util.spawn([DEFAULT_EXEC, fileName]);
    },

    _getResultSet: function (obj, result, callback) {
        let results = [];
        var cursor = obj.query_finish(result);
        
        try {
            while (cursor != null && cursor.next(null)) {
                var urn = cursor.get_string(0)[0];
                var uri = cursor.get_string(1)[0];
                var title = cursor.get_string(2)[0];
                var parentUri = cursor.get_string(3)[0];
                var lastMod = cursor.get_string(4)[0];
                var lastMod = "Modified: " + lastMod.split('T')[0];
                var filename = decodeURI(uri.split('/').pop());
                // if file does not exist, it won't be shown
                var f = Gio.file_new_for_uri(uri);

                if(!f.query_exists(null)) {continue;}

                var path = f.get_path();
                // clean up path
                var prettyPath = path.substr(0,path.length - filename.length).replace("/home/" + GLib.get_user_name() , "~");
                // contentType is an array, the index "1" set true,
                // if function is uncertain if type is the right one
                let contentType = Gio.content_type_guess(path, null);
                var newContentType = contentType[0];
                if(contentType[1]){
                    if(newContentType == "application/octet-stream") {
                        let fileInfo = Gio.file_new_for_path(path).query_info('standard::type', 0, null);
                        // for some reason 'content_type_guess' returns a wrong mime type for folders
                        if(fileInfo.get_file_type() == Gio.FileType.DIRECTORY) {
                            newContentType = "inode/directory";
                        } else {
                            // unrecognized mime-types are set to text, so that later an icon can be picked
                            newContentType = "text/x-log";
                        }
                    };
                }
                results.push(uri);
                this.resultsMap.set(uri, {
                    'id' : uri,
                    'name' : title,
                    'path' : path,
                    'filename': filename,
                    'lastMod' : lastMod,
                    'prettyPath' : prettyPath,
                    'contentType' : newContentType
                });
            };
        } catch (error) {
            //global.log("TrackerSearchProvider: Could not traverse results cursor: " + error.message);
        }
        callback(results);
    },

    _connection_ready : function(object, result, terms, filetype, callback) {
        try {
            var conn = Tracker.SparqlConnection.get_finish(result);
            var query = this._getQuery(terms, filetype);
            var cursor = conn.query_async(query, null, Lang.bind(this, this._getResultSet, callback));
        } catch (error) {
            global.log("Querying Tracker failed. Please make sure you have the --GObject Introspection-- package for Tracker installed.");
            global.log(error.message);
        }
    },

    getInitialResultSet : function(terms, callback, cancellable) {
        // terms holds array of search items
        // check if 1st search term is >2 letters else drop the request
        if(terms.length ===1 && terms[0].length < 3) {
            return [];
        }

        // check if search starts with keyword: m (=music), i (=images), v (=videos)
        if(terms.length > 1) {
            if(terms[1].length < 3) {
                return [];
            }
            
            if(terms[0].lastIndexOf("v",0) === 0) {
                var filetype = "Video";
            }
            if(terms[0].lastIndexOf("m",0) === 0) {
                var filetype = "Audio";
            }
            if(terms[0].lastIndexOf("i",0) === 0) {
                var filetype = "Image";
            }

        }

        try {
            Tracker.SparqlConnection.get_async(null, Lang.bind(this, this._connection_ready, terms, filetype, callback));
        } catch (error) {
            global.log("Querying Tracker failed. Please make sure you have the --GObject Introspection-- package for Tracker installed.");
            global.log(error.message);
        }
        return [];
    },

    getSubsearchResultSet : function(previousResults, terms, callback, cancellable) {
        // check if 1st search term is >2 letters else drop the request
        if(terms.length ===1 && terms[0].length < 3) {
            return [];
        }
        this.getInitialResultSet(terms, callback, cancellable);
        return [];
    },

    filterResults : function(results, max) {
        return results.slice(0, MAX_RESULTS);
    },

    launchSearch: function(terms) {
        if(terms.length > 1) {            
            // tracker-needle doesn't support file types
            terms = terms[1];   
        }
        
        let app = Gio.AppInfo.create_from_commandline("tracker-needle " + terms, null, Gio.AppInfoCreateFlags.SUPPORTS_STARTUP_NOTIFICATION);
        let context = global.create_app_launch_context(0, -1);
        app.launch([], context);
    }
});

function init() {
//global.log("-------- fmi init: hier sollte die Tracker-Connection aufgebaut werden?");
}

function enable() {
//    if (!trackerSearchProviderFolders){
//        trackerSearchProviderFolders = new TrackerSearchProvider("FOLDERS", CategoryType.FOLDERS);
//        //Main.overview.addSearchProvider(trackerSearchProviderFolders);
//        Main.overview.viewSelector._searchResults._searchSystem.addProvider(trackerSearchProviderFolders);
//    }

    if (!trackerSearchProviderFiles) {
        trackerSearchProviderFiles = new TrackerSearchProvider("FILES", CategoryType.FTS);
        //Main.overview.addSearchProvider(trackerSearchProviderFiles);
        Main.overview.viewSelector._searchResults._registerProvider(trackerSearchProviderFiles);
    }
}

function disable() {
    if (trackerSearchProviderFiles){
        //Main.overview.removeSearchProvider(trackerSearchProviderFiles);
        Main.overview.viewSelector._searchResults._unregisterProvider(trackerSearchProviderFiles);
        trackerSearchProviderFiles = null;
    }

//    if (trackerSearchProviderFolders) {
//        //Main.overview.removeSearchProvider(trackerSearchProviderFolders);
//        Main.overview.viewSelector._searchResults._searchSystem._unregisterProvider(trackerSearchProviderFolders);
//        trackerSearchProviderFolders = null;
//    }
}

