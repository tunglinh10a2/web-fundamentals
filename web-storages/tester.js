/* eslint no-unused-vars:off */
function createTester() {
  'use strict';

  var pouch = new PouchDB('pouch_test');
  var lokiDB = new loki('loki_test'); /* eslint new-cap:off */
  var lokiDocs = lokiDB.addCollection('docs', { indices: ['id'] });
  var dexieDB = new Dexie('dexie_test');
  dexieDB.version(1).stores({ docs: '++,id' });
  var openIndexedDBReq;
  var webSQLDB;
  var localForageDB = localforage.createInstance({ name: 'test_localforage' });
  var localForageWebSQLDB = localforage.createInstance({ name: 'test_localforage_websql', driver: localforage.WEBSQL });
  var obj, map, set, imMap, imSet;

  function createDoc() {
    return {
      data: Math.random()
    };
  }

  function createDocs(numDocs) {
    var docs = new Array(numDocs);
    for (var i = 0; i < numDocs; i++) {
      docs[i] = createDoc();
    }
    return docs;
  }

  function regularObjectTest(docs) {
    obj = {};
    for (var i = 0; i < docs.length; i++) {
      obj['doc_' + i] = docs[i];
    }
  }

  function mapTest(docs) {
    map = new Map();
    for (var i = 0; i < docs.length; i++) {
      map.set('doc_' + i, docs[i]);
    }
  }

  function setTest(docs) {
    set = new Set();
    for (var i = 0; i < docs.length; i++) {
      set.add(docs[i]);
    }
  }

  function imMapTest(docs) {
    imMap = new Immutable.Map();
    for (var i = 0; i < docs.length; i++) {
      imMap = imMap.set('doc_' + i, docs[i]);
    }
  }

  function imListTest(docs) {
    var imList = new Immutable.List();
    for (var i = 0; i < docs.length; i++) {
      imList = imList.push(docs[i]);
    }
  }

  function imFromJSTest(docs) {
    var obj = {};
    for (var i = 0; i < docs.length; i++) {
      obj['doc_' + i] = docs[i];
    }
    Immutable.fromJS(obj);
  }

  function imMapMergeDeepTest(docs) {
    var imMap = new Immutable.Map();
    var obj = {};
    for (var i = 0; i < docs.length; i++) {
      obj['doc_' + i] = docs[i];
    }
    imMap.mergeDeep(obj);
  }

  function imSetTest(docs) {
    imSet = new Immutable.Set();
    for (var i = 0; i < docs.length; i++) {
      imSet = imSet.add(docs[i]);
    }
  }

  function localStorageTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      localStorage['doc_' + i] = JSON.stringify(docs[i]);
    }
  }

  function pouchTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        doc._id = 'doc_' + i;
        return pouch.put(doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function lokiTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      doc.id = 'doc_ ' + i;
      lokiDocs.insert(doc);
    }
  }

  function localForageTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        return localForageDB.setItem('doc_' + i, doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function localForageWebSQLTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        return localForageWebSQLDB.setItem('doc_' + i, doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function dexieTest(docs) {
    return dexieDB.transaction('rw', dexieDB.docs, function() {
      for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        doc.id = 'doc_' + i;
        dexieDB.docs.add(doc);
      }
    });
  }

  function idbTest(docs) {
    return Promise.resolve().then(function() {
      if (openIndexedDBReq) {
        // reuse the same event to avoid onblocked when deleting
        return openIndexedDBReq.result;
      }
      return new Promise(function(resolve, reject) {
        var req = openIndexedDBReq = indexedDB.open('test_idb', 1);
        req.onblocked = reject;
        req.onerror = reject;
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          db.createObjectStore('docs', { keyPath: 'id' });
        };
        req.onsuccess = function(e) {
          var db = e.target.result;
          resolve(db);
        };
      });
    }).then(function(db) {
      return new Promise(function(resolve, reject) {
        var txn = db.transaction('docs', 'readwrite');
        var oStore = txn.objectStore('docs');
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          doc.id = 'doc_' + i;
          oStore.put(doc);
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
        txn.onblocked = reject;
      });
    });
  }

  function webSQLTest(docs) {
    return Promise.resolve().then(function() {
      if (webSQLDB) {
        return;
      }
      return new Promise(function(resolve, reject) {
        webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function(txn) {
          txn.executeSql(
            'create table if not exists docs (id text unique, json text);');
        }, reject, resolve);
      });
    }).then(function() {
      return new Promise(function(resolve, reject) {
        webSQLDB.transaction(function(txn) {
          for (var i = 0; i < docs.length; i++) {
            var id = 'doc_' + i;
            var doc = docs[i];
            txn.executeSql(
              'insert or replace into docs (id, json) values (?, ?);', [
                id, JSON.stringify(doc)
              ]);
          }
        }, reject, resolve);
      });
    });
  }

  function getTest(db) {
    var fun = _getTest(db);
    return test;
    function test(arg) {
      if (typeof arg === 'number') {
        var docs = createDocs(arg);
        return fun(docs);
      } else {
        return fun(arg);
      }
    }
  }

  function _getTest(db) {
    switch (db) {
      case 'regularObject':
        return regularObjectTest;
      case 'localStorage':
        return localStorageTest;
      case 'pouch':
        return pouchTest;
      case 'loki':
        return lokiTest;
      case 'localForage':
        return localForageTest;
      case 'localForageWebSQL':
        return localForageWebSQLTest;
      case 'dexie':
        return dexieTest;
      case 'idb':
        return idbTest;
      case 'webSQL':
        return webSQLTest;
      case 'map':
        return mapTest;
      case 'set':
        return setTest;
      case 'immap':
        return imMapTest;
      case 'imset':
        return imSetTest;
      case 'imlist':
        return imListTest;
      case 'imfromjs':
        return imFromJSTest;
      case 'immergedeep':
        return imMapMergeDeepTest;
    }
  }

  function cleanup() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    lokiDocs.chain().remove();

    var promises = [
      new Promise(function(resolve, reject) {
        if (typeof openDatabase === 'undefined') {
          return resolve();
        }
        var webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function(txn) {
          txn.executeSql('delete from docs;');
        }, resolve, resolve);
      }),
      new Promise(function(resolve, reject) {
        if (openIndexedDBReq) {
          openIndexedDBReq.result.close();
        }
        var req = indexedDB.deleteDatabase('test_idb');
        req.onsuccess = resolve;
        req.onerror = reject;
        req.onblocked = reject;
      }),
      Promise.resolve().then(function() {
        if (typeof localforage !== 'undefined') {
          return localForageDB.clear();
        }
      }),
      Promise.resolve().then(function() {
        if (typeof openDatabase !== 'undefined' &&
            typeof localforage !== 'undefined') {
          return localForageWebSQLDB.clear();
        }
      }),
      dexieDB.docs.clear(),
      pouch.destroy().then(function() {
        pouch = new PouchDB('pouch_test');
      }),
      Promise.resolve().then(function() {
        return Promise.resolve();
      })
    ];

    return Promise.all(promises);
  }

  return {
    getTest: getTest,
    cleanup: cleanup,
    createDocs: createDocs
  };
}
