const screenKey = screen => `${screen.tab}:${screen.view?.kind || ''}:${
  screen.view?.data?.id || screen.view?.data?.sourceSession?.id || ''}`;

// History contains small navigation tokens only. Workout data stays in the
// app's normal storage; an Android back gesture never discards a live session.
export function createNavigationHistory(browser, onScreen) {
  const session = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const frames = [{ screen: { tab: 'home', view: null }, active: true }];
  const guards = [];
  const queued = [];
  let index = 0;
  let initialized = false;
  let pending = false;
  const marker = i => ({ ...browser.history.state, ironlogNavigation: { session, index: i } });
  const run = action => { if (pending) queued.push(action); else action(); };
  const flush = () => { while (!pending && queued.length) queued.shift()(); };
  const travel = target => {
    if (target === index) return;
    pending = true;
    browser.history.go(target - index);
  };
  const push = frame => {
    frames.splice(index + 1);
    frames.push(frame);
    index++;
    browser.history.pushState(marker(index), '');
  };
  const pop = event => {
    const internal = pending;
    pending = false;
    const token = event.state?.ironlogNavigation;
    if (token?.session !== session || !frames[token.index]) {
      // A reload has lost the in-memory routes. Safely return to the menu
      // for old same-document entries, without trapping exit at the root.
      index = 0;
      frames.splice(1);
      browser.history.replaceState(marker(0), '');
      onScreen(frames[0].screen);
      flush();
      return;
    }
    const target = token.index;
    const direction = target < index ? -1 : 1;
    const next = frames[target];
    if (!internal && target < index && screenKey(next.screen) !== screenKey(frames[index].screen)) {
      const guard = [...guards].reverse().find(item => item.active);
      if (guard?.onBack()) {
        // popstate is not cancellable: restore the editor before opening
        // its confirmation. Subsequent UI navigations bypass this guard.
        pending = true;
        browser.history.go(index - target);
        return;
      }
    }
    const oldIndex = index;
    index = target;
    if (target < oldIndex) {
      for (let i = oldIndex; i > target; i--) {
        const frame = frames[i];
        if (frame.layer && frame.active) {
          frame.active = false;
          frame.onBack();
        }
      }
    }
    if (!next.active) {
      let destination = target + direction;
      while (frames[destination] && !frames[destination].active) destination += direction;
      if (frames[destination]) travel(destination);
      else { browser.history.replaceState(marker(0), ''); index = 0; onScreen(frames[0].screen); }
    } else onScreen(next.screen);
    flush();
  };

  return {
    get screen() { return frames[index].screen; },
    start() {
      if (!initialized) {
        browser.history.replaceState(marker(0), '');
        initialized = true;
      }
      browser.addEventListener('popstate', pop);
      return () => browser.removeEventListener('popstate', pop);
    },
    navigate(update, { replace = false } = {}) {
      run(() => {
        if (frames[index].layer) {
          let route = index - 1;
          while (route > 0 && frames[route].layer) route--;
          queued.unshift(() => this.navigate(update, { replace }));
          travel(route);
          return;
        }
        const screen = update(frames[index].screen);
        if (screenKey(screen) === screenKey(frames[index].screen)) {
          frames[index].screen = screen;
          onScreen(screen);
          return;
        }
        if (replace) {
          frames[index] = { screen, active: true };
          browser.history.replaceState(marker(index), '');
          onScreen(screen);
          return;
        }
        for (let i = index - 1; i >= 0; i--) {
          if (!frames[i].layer && frames[i].active && screenKey(frames[i].screen) === screenKey(screen)) {
            frames[i].screen = screen;
            travel(i);
            return;
          }
        }
        push({ screen, active: true });
        onScreen(screen);
      });
    },
    layer(onBack) {
      const frame = { screen: null, active: true, layer: true, onBack };
      run(() => {
        if (!frame.active) return;
        frame.screen = frames[index].screen;
        push(frame);
      });
      return () => {
        frame.active = false;
        run(() => {
          if (frames[index] !== frame) return;
          let target = index - 1;
          while (target > 0 && !frames[target].active) target--;
          travel(target);
        });
      };
    },
    guard(onBack) {
      const guard = { active: true, onBack };
      guards.push(guard);
      return () => { guard.active = false; guards.splice(guards.indexOf(guard), 1); };
    },
  };
}
