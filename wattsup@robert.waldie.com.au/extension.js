const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const RateMenu = new Lang.Class({
	Name: 'RateMenu',
	Extends: PanelMenu.Button,

	_init: function() {
		this.parent(0.0, "Power Rate Indicator", false);
		this._rate = new Number(0.0);
		this._maxRate = new Number(6.0);
		this._initRateMon();
		this._buildUi();
	},

	_buildUi: function() {
		this._rateLabel = new St.Label({ text: ":|" });
		this.actor.add_actor(this._rateLabel);
		this.menu.removeAll();
		this._curRateItem = new PopupMenu.PopupImageMenuItem("NFI", "view-refresh-symbolic");
		this._curRateItem.connect("activate", function() {
			if (rateMenu) {
				rateMenu.forceUpdateRate();
			}
		});
		this.menu.addMenuItem(this._curRateItem);
		this._updateUi();
	},

	_updateUi: function() {
		this._curRateItem.label.text = "Energy Rate " + this._rate.toString();
		if (this._rate > this._maxRate) {
			this._rateLabel.text = ":(";
		} else {
			this._rateLabel.text = ":)";
		}
	},

	_getRate: function() {
		// dbus-send --system --type=method_call --print-reply --dest=org.freedesktop.UPower /org/freedesktop/UPower/devices/battery_BAT0 org.freedesktop.DBus.Properties.Get string:org.freedesktop.UPower.Device string:EnergyRate
		let value = this.dProxy.GetSync("org.freedesktop.UPower.Device", "EnergyRate");
		this._rate = value[0].unpack();
	},

	_refreshRate: function() {
		// dbus-send --print-reply --system --dest=org.freedesktop.UPower /org/freedesktop/UPower/devices/battery_BAT0 org.freedesktop.UPower.Device.Refresh
		this.uProxy.RefreshSync();
	},

	updateRate: function() {
		this._getRate();
		this._updateUi();
	},

	forceUpdateRate: function() {
		this._refreshRate();
	},

	_initRateMon: function() {
		const DBusPropertiesInterface = '<node> \
			<interface name="org.freedesktop.DBus.Properties"> \
				<method name="Get"> \
					<arg type="s" name="interface_name" direction="in"/> \
					<arg type="s" name="property_name" direction="in"/> \
					<arg type="v" name="value" direction="out"/> \
				</method> \
				<method name="GetAll"> \
					<arg type="s" name="interface_name" direction="in"/> \
					<arg type="a{sv}" name="properties" direction="out"/> \
				</method> \
				<method name="Set"> \
					<arg type="s" name="interface_name" direction="in"/> \
					<arg type="s" name="property_name" direction="in"/> \
					<arg type="v" name="value" direction="in"/> \
				</method> \
				<signal name="PropertiesChanged"> \
					<arg type="s" name="interface_name"/> \
					<arg type="a{sv}" name="changed_properties"/> \
					<arg type="as" name="invalidated_properties"/> \
				</signal> \
			</interface> \
			</node>';

		const DBusPropertiesProxy = Gio.DBusProxy.makeProxyWrapper(DBusPropertiesInterface);
		this.dProxy = new DBusPropertiesProxy(
			Gio.DBus.system,
			"org.freedesktop.UPower",
			"/org/freedesktop/UPower/devices/battery_BAT0"
		);
		this.dProxy.connectSignal("PropertiesChanged", function() {
			if (rateMenu) {
				rateMenu.updateRate();
			}
		});
		this._getRate();

		const UPowerInterface = '<node> \
			<interface name="org.freedesktop.UPower.Device"> \
				<method name="Refresh"> \
					<annotation name="org.freedesktop.DBus.GLib.Async" value=""/> \
				</method> \
			</interface> \
		</node>';

		const UPowerProxy = Gio.DBusProxy.makeProxyWrapper(UPowerInterface);
		this.uProxy = new UPowerProxy(
			Gio.DBus.system,
			"org.freedesktop.UPower",
			"/org/freedesktop/UPower/devices/battery_BAT0"
		);
	}
});

let rateMenu = null;

function init() {
}

function enable() {
	rateMenu = new RateMenu;
	Main.panel.addToStatusArea('wattsup-indicator', rateMenu);
}

function disable() {
	rateMenu.destroy();
	rateMenu = null;
}
