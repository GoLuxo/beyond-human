import { useEffect, useState } from 'react';
import { Moon, Sun, Bell, Download, Upload, FolderOpen, Trash2 } from 'lucide-react';
import { useAppState, getState, replaceState, defaultState, isValidBackup } from '../state/store.js';
import { updateProfile, updateSettings, updateNotifications } from '../state/actions.js';
import { Switch, Segmented, InlineEdit } from '../components/ui.jsx';
import { system, systemNotify, isDesktop } from '../lib/platform.js';
import { toast } from '../lib/events.js';
import { formatHour } from '../lib/dates.js';
import { useGfx, QUALITY } from '../gfx/engine.js';

function Row({ title, desc, children }) {
  return (
    <div className="set-row">
      <div>
        <strong>{title}</strong>
        {desc && <p className="muted">{desc}</p>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function TimedToggle({ value, onChange, label }) {
  return (
    <>
      {value.on && <input className="input time-input" type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} aria-label={`${label} time`} />}
      <Switch checked={value.on} onChange={(on) => onChange({ ...value, on })} label={label} />
    </>
  );
}

function GraphicsStatus() {
  const g = useGfx();
  if (g.state === 'failed') return <p className="muted">GPU rendering isn't available on this PC, so the app uses its lightweight 2D renderer.</p>;
  if (g.state !== 'running') return <p className="muted">Starting the GPU renderer…</p>;
  return (
    <>
      <p className="muted">
        Rendering with {g.backend}
        {g.gpu ? ` on ${g.gpu}` : ''} at <span className="num">{g.fps}</span> frames per second.
      </p>
      {g.safe && (
        <div className="safe-graphics">
          <p>
            Safe graphics mode is on because {window.__beyond?.safeReason || 'the graphics driver had a problem'}. Effects stay on, using a more
            compatible renderer.
          </p>
          <button className="btn btn-sm" onClick={() => system.resetSafeGraphics()}>
            Try full graphics again
          </button>
        </div>
      )}
    </>
  );
}

export default function Settings() {
  const state = useAppState();
  const { settings, profile } = state;
  const n = settings.notifications;
  const [loginItem, setLoginItem] = useState(false);
  const [packaged, setPackaged] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    system.getLoginItem().then(setLoginItem);
    system.isPackaged().then(setPackaged);
  }, []);

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="settings">
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Everything is saved on this computer as you change it.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="panel set-group">
          <h3>Profile</h3>
          <Row title="Name">
            <InlineEdit className="input" value={profile.name} onSave={(name) => name.trim() && updateProfile({ name: name.trim() })} ariaLabel="Name" />
          </Row>
          <Row title="North Star" desc="Your one defining goal, shown on Goals.">
            <InlineEdit className="input" value={profile.northStar} onSave={(northStar) => updateProfile({ northStar })} ariaLabel="North Star" />
          </Row>
        </section>

        <section className="panel set-group">
          <h3>Appearance</h3>
          <Row title="Theme">
            <Segmented
              label="Theme"
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
              options={[
                { value: 'dark', label: 'Void', icon: Moon },
                { value: 'light', label: 'Lumen', icon: Sun },
              ]}
            />
          </Row>
          <Row title="Sound effects" desc="Chimes when you complete things.">
            <Switch checked={settings.sound} onChange={(sound) => updateSettings({ sound })} label="Sound effects" />
          </Row>
          <Row title="Graphics quality" desc="Ultra renders at full screen sharpness. Battery saver turns off bloom and caps at 30 fps.">
            <Segmented
              label="Graphics quality"
              value={settings.graphics}
              onChange={(graphics) => updateSettings({ graphics })}
              options={Object.entries(QUALITY).map(([value, q]) => ({ value, label: q.label }))}
            />
          </Row>
          <Row title="Show frame rate" desc="A live FPS counter in the title bar.">
            <Switch checked={settings.showFps} onChange={(showFps) => updateSettings({ showFps })} label="Show frame rate" />
          </Row>
          <GraphicsStatus />
          <Row title="Reduce motion" desc="Calmer starfield and no particle bursts.">
            <Switch checked={settings.reduceMotion} onChange={(reduceMotion) => updateSettings({ reduceMotion })} label="Reduce motion" />
          </Row>
        </section>

        <section className="panel set-group span-2">
          <div className="set-group-head">
            <h3>Notifications</h3>
            <button className="btn btn-sm" onClick={() => systemNotify({ title: 'Beyond Human', body: 'Notifications are working. See you at the top.' })}>
              <Bell /> Send a test
            </button>
          </div>
          <Row title="Windows notifications" desc="Arrive even when the app is closed to the tray.">
            <Switch checked={n.enabled} onChange={(enabled) => updateNotifications({ enabled })} label="Windows notifications" />
          </Row>
          <div className={n.enabled ? '' : 'set-disabled'}>
            <Row title="Morning briefing" desc="Today's plan, habits and a quote to start the day.">
              <TimedToggle value={n.morning} onChange={(morning) => updateNotifications({ morning })} label="Morning briefing" />
            </Row>
            <Row title="Afternoon quote" desc="A shot of motivation when energy dips.">
              <TimedToggle value={n.quote} onChange={(quote) => updateNotifications({ quote })} label="Afternoon quote" />
            </Row>
            <Row title="Streak guard" desc="A nudge if today isn't lit yet.">
              <TimedToggle value={n.streak} onChange={(streak) => updateNotifications({ streak })} label="Streak guard" />
            </Row>
            <Row title="Evening reflection" desc="A reminder to journal if you haven't yet.">
              <TimedToggle value={n.evening} onChange={(evening) => updateNotifications({ evening })} label="Evening reflection" />
            </Row>
            <Row title="Habit reminders" desc="At the time set on each habit.">
              <Switch checked={n.habits} onChange={(habits) => updateNotifications({ habits })} label="Habit reminders" />
            </Row>
            <Row title="Upcoming tasks" desc="Before scheduled tasks on your timeline start.">
              {n.planner && (
                <select className="select time-input" value={n.plannerLead} onChange={(e) => updateNotifications({ plannerLead: Number(e.target.value) })} aria-label="Minutes before">
                  {[0, 5, 10, 15, 30].map((m) => (
                    <option key={m} value={m}>
                      {m ? `${m} min before` : 'At start'}
                    </option>
                  ))}
                </select>
              )}
              <Switch checked={n.planner} onChange={(planner) => updateNotifications({ planner })} label="Upcoming tasks" />
            </Row>
            <Row title="Focus timer" desc="When a session or break ends.">
              <Switch checked={n.focus} onChange={(focus) => updateNotifications({ focus })} label="Focus timer" />
            </Row>
            <Row title="Achievements and level-ups" desc="Shown while the app is in the background.">
              <Switch checked={n.achievements} onChange={(achievements) => updateNotifications({ achievements })} label="Achievements" />
            </Row>
          </div>
        </section>

        <section className="panel set-group">
          <h3>Planner</h3>
          <Row title="Week starts on">
            <Segmented
              label="Week starts on"
              value={settings.weekStart}
              onChange={(weekStart) => updateSettings({ weekStart })}
              options={[
                { value: 1, label: 'Monday' },
                { value: 0, label: 'Sunday' },
              ]}
            />
          </Row>
          <Row title="Timeline hours">
            <select className="select time-input" value={settings.dayStart} onChange={(e) => updateSettings({ dayStart: Math.min(Number(e.target.value), settings.dayEnd) })} aria-label="Timeline start">
              {hours.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
            <span className="faint">to</span>
            <select className="select time-input" value={settings.dayEnd} onChange={(e) => updateSettings({ dayEnd: Math.max(Number(e.target.value), settings.dayStart) })} aria-label="Timeline end">
              {hours.map((h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </Row>
        </section>

        <section className="panel set-group">
          <h3>Windows</h3>
          <Row title="Start with Windows" desc={packaged ? 'Opens quietly in the tray when you sign in.' : 'Available in the installed app.'}>
            <Switch
              checked={loginItem}
              onChange={async (v) => {
                const result = await system.setLoginItem(v);
                setLoginItem(result);
                if (!packaged) toast('Start with Windows works once the app is installed.');
              }}
              label="Start with Windows"
            />
          </Row>
          <Row title="Keep running in the tray" desc="Closing the window keeps reminders coming.">
            <Switch checked={settings.minimizeToTray} onChange={(minimizeToTray) => updateSettings({ minimizeToTray })} label="Keep running in the tray" />
          </Row>
        </section>

        <section className="panel set-group span-2">
          <h3>Your data</h3>
          <Row title="Back up" desc="Save everything to a file you can keep or move to another PC.">
            <button
              className="btn btn-sm"
              onClick={async () => {
                const r = await system.exportData(getState());
                if (r.ok) toast('Backup saved');
              }}
            >
              <Download /> Export backup
            </button>
          </Row>
          {isDesktop && (
            <Row title="Restore" desc="Replace everything here with a backup file.">
              <button
                className="btn btn-sm"
                onClick={async () => {
                  const r = await system.importData();
                  if (!r.ok) return r.error && toast(r.error);
                  if (!isValidBackup(r.data)) return toast('That file is not a valid Beyond Human backup.');
                  replaceState(r.data);
                  return toast('Backup restored');
                }}
              >
                <Upload /> Import backup
              </button>
            </Row>
          )}
          {isDesktop && (
            <Row title="Data folder" desc={window.__beyond?.dataPath}>
              <button className="btn btn-sm" onClick={system.openDataFolder}>
                <FolderOpen /> Show in Explorer
              </button>
            </Row>
          )}
          <Row title="Start over" desc="Erase all goals, habits, tasks and history. This can't be undone.">
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  setTimeout(() => setConfirmReset(false), 4000);
                  return;
                }
                replaceState(defaultState());
              }}
            >
              <Trash2 /> {confirmReset ? 'Click again to erase everything' : 'Erase all data'}
            </button>
          </Row>
          <p className="faint about">Beyond Human {window.__beyond?.version}</p>
        </section>
      </div>
    </div>
  );
}
