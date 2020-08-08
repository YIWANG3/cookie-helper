let currentTabID;
let currentTabUrl;
let allCookies = [];

const renderCookieList = function (parentDomSelector, cookieList) {
    cookieList.forEach(cookie => {
        let cookieItem = $("<div>", {class: "cookie-item"});
        cookieItem.append($("<div>", {text: cookie.name, class: "cookie-key"}));
        cookieItem.append($("<div>", {text: cookie.value, class: "cookie-value"}));
        $(parentDomSelector).append(cookieItem);
    })
};

const setCookieList = (cookieList) => {
    renderCookieList("#cookiesList", cookieList);
};

const buildCookieData = (props) => {
    let {name, value, domain, path} = props;
    var newCookie = {};
    newCookie.url = currentTabUrl;
    newCookie.name = name;
    newCookie.value = value;
    newCookie.path = path;
    newCookie.domain = domain;
    return newCookie;
};

const setCookie = (url, cookie) => {
    chrome.cookies.remove({
        url: url,
        name: cookie.name,
    }, function () {
        chrome.cookies.set(cookie);
        doSearch();
    })
};

const restoreQuickSetContent = () => {
    chrome.storage.local.get(['quickSet'], function (result) {
        $("#quick-set-content").val(result.quickSet)
    });
};

const setQuickSetCookies = () => {
    let content = $("#quick-set-content").val();
    let parsedCookie = Cookie.parse(content);
    alert("Set:" + JSON.stringify(parsedCookie));
    for (let key in parsedCookie) {
        let _cookie = buildCookieData({
            name: key,
            value: parsedCookie[key]
        });
        setCookie(currentTabUrl, _cookie);
    }
};

const addQuickSetListener = () => {
    $("#quick-set-content").on("input", () => {
        let content = $("#quick-set-content").val();
        chrome.storage.local.set({"quickSet": content});
    });

    $("#quick-set-btn").unbind().click(() => {
        setQuickSetCookies();
    })
};

const cookieConfigs = [
    {
        data: "domain"
    }, {
        data: "name"
    }, {
        data: "value",
        width: 320
    }, {
        data: "expirationDate",
        width: 140
    }, {
        data: "path"
    }, {
        data: "hostOnly",
        type: "checkbox"
    }, {
        data: "httpOnly",
        type: "checkbox"
    }, {
        data: "secure",
        type: "checkbox"
    }, {
        data: "session",
        type: "checkbox"
    }, {
        data: "sameSite"
    }, {
        data: "storedId"
    }
];

const renderCookieTable = function (cookies) {
    if (cookies && cookies.length > 0) {
        let container = document.getElementById('cookieTable');
        container.innerHTML = null;
        let hot = new Handsontable(container, {
            data: cookies,
            colHeaders: cookieConfigs.map(item => item.data),
            columns: (column) => cookieConfigs[column],
            width: 732,
            height: 300,
            manualColumnResize: true,
            filters: true,
            contextMenu: true,
            search: {
                searchResultClass: 'searchResultClass'
            },
            afterChange: (changes) => {
                // changes.forEach((ch) => {
                //     // $("#log").text(JSON.stringify(ch))
                //     // $("#log").text(JSON.stringify(allCookies));
                // });
            },
            afterRemoveRow: (changes) => {
                $("#log").text(JSON.stringify(changes));
            },
            licenseKey: 'non-commercial-and-evaluation',
        });

        let searchInput = document.getElementById('cookie-search-input');

        Handsontable.dom.addEvent(searchInput, 'keyup', function (event) {
            let search = hot.getPlugin('search');
            let queryResult = search.query(this.value);
            console.log(queryResult);
            hot.render();
        });

    }
};

function doSearch() {
    let url = $('input', '#cookieSearchCondition').val();
    if (url.length < 3)
        return;
    let filter = new Filter();
    if (/^https?:\/\/.+$/.test(url)) {
        filter.setUrl(url);
    } else {
        filter.setDomain(url);
    }
    createList(filter.getFilter());
}

function processCookieList(cookieList) {
    cookieList.forEach(item => {
        if (item.expirationDate) {
            item.expirationDate = dateFormat(new Date(+item.expirationDate * 1000), "mm/dd/yyyy hh:mm:ss");
        }
    });
}

function createList(filters) {
    let filteredCookies = [];

    if (filters === null)
        filters = {};

    let filterURL = {};
    if (filters.url !== undefined)
        filterURL.url = filters.url;
    if (filters.domain !== undefined)
        filterURL.domain = filters.domain;

    chrome.cookies.getAllCookieStores(function (cookieStores) {
        for (let x = 0; x < cookieStores.length; x++) {
            if (cookieStores[x].tabIds.indexOf(currentTabID) != -1) {
                filterURL.storeId = cookieStores[x].id;
                break;
            }
        }

        chrome.cookies.getAll(filterURL, function (cks) {
            let currentC;
            for (let i = 0; i < cks.length; i++) {
                currentC = cks[i];

                if (filters.name !== undefined && currentC.name.toLowerCase().indexOf(filters.name.toLowerCase()) === -1)
                    continue;
                if (filters.domain !== undefined && currentC.domain.toLowerCase().indexOf(filters.domain.toLowerCase()) === -1)
                    continue;
                if (filters.secure !== undefined && currentC.secure.toLowerCase().indexOf(filters.secure.toLowerCase()) === -1)
                    continue;
                if (filters.session !== undefined && currentC.session.toLowerCase().indexOf(filters.session.toLowerCase()) === -1)
                    continue;

                filteredCookies.push(currentC);
            }

            $("#cookiesList").empty();
            allCookies = filteredCookies;
            processCookieList(allCookies);
            setCookieList(allCookies);
            renderCookieTable(allCookies);
        });
    });
}


window.addEventListener("DOMContentLoaded", async () => {
    restoreQuickSetContent();
    addQuickSetListener();
    chrome.tabs.query(
        {
            active: true,
            currentWindow: true,
        },
        (tabs) => {
            // document.getElementById("log").innerText = JSON.stringify(tabs);
            currentTabId = tabs[0].id;
            currentTabUrl = tabs[0].url;

            $('input', '#cookieSearchCondition').val(currentTabUrl);
            document.title = document.title + "-" + currentTabUrl;
            doSearch();
        }
    );
});
