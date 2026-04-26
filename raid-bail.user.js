// ==UserScript==
// @name         Raid Bail
// @namespace    twitchraidbail.thetomcanuck.userscript
// @author       TheTomCanuck
// @version      1.1
// @description  auto-close twitch tabs when raided into unwanted channels
// @match        https://www.twitch.tv/*
// @match        https://twitch.tv/*
// @homepageURL  https://github.com/TheTomCanuck/Userscript-twitch-raid-bail
// @updateURL    https://raw.githubusercontent.com/TheTomCanuck/Userscript-twitch-raid-bail/master/raid-bail.user.js
// @downloadURL  https://raw.githubusercontent.com/TheTomCanuck/Userscript-twitch-raid-bail/master/raid-bail.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // whitelist = if you get raided anywhere not on the list you bail
    // blacklist = if you get raided anywhere on the list you bail
    const MODE = 'blacklist';

    // twitch channels
    const CHANNELS = [
        'example_channel1',
        'example_channel2',
    ];

    // redirect
    const REDIRECT = 'thetomcanuck.com';

    // =====================================================

    const normalizedChannels = CHANNELS.map(entry => {
        let clean = entry.trim().split(/[?#]/)[0];
        clean = clean.replace(/^https?:\/\//i, '');
        clean = clean.replace(/^(www\.)?twitch\.tv\//i, '');
        clean = clean.replace(/\/+$/, '');
        return clean.toLowerCase();
    });

    function bail() {
        const url = /^https?:\/\//i.test(REDIRECT) ? REDIRECT : 'https://' + REDIRECT;
        window.location.replace(url);
    }

    function shouldBail(channel) {
        const inList = normalizedChannels.includes(channel.toLowerCase());
        return (MODE === 'blacklist' && inList) || (MODE === 'whitelist' && !inList);
    }

    function checkUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('referrer') !== 'raid') return;
        const path = window.location.pathname.split('/').filter(Boolean);
        if (path.length === 0) return;
        if (shouldBail(path[0])) bail();
    }

    // re-check on every SPA navigation — Twitch uses History API, so a raid
    // mid-session never triggers a real page load
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function () {
        const r = origPush.apply(this, arguments);
        checkUrl();
        return r;
    };
    history.replaceState = function () {
        const r = origReplace.apply(this, arguments);
        checkUrl();
        return r;
    };
    window.addEventListener('popstate', checkUrl);

    // backup: watch HLS requests for a raid_id, in case ?referrer=raid is missing
    const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
            if (entry.name.includes('raid_id')) {
                const match = entry.name.match(/\/channel\/hls\/([^.]+)\.m3u8/);
                if (match && shouldBail(match[1])) bail();
            }
        }
    });
    observer.observe({ type: 'resource', buffered: true });

    checkUrl();
})();
