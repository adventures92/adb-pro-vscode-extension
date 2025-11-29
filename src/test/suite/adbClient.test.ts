import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { AdbClient } from '../../adbClient';

suite('AdbClient Test Suite', () => {
    let adbClient: AdbClient;
    let executeStub: sinon.SinonStub;
    let outputChannelStub: vscode.OutputChannel;

    setup(() => {
        outputChannelStub = {
            append: sinon.spy(),
            appendLine: sinon.spy(),
            clear: sinon.spy(),
            show: sinon.spy(),
            hide: sinon.spy(),
            dispose: sinon.spy(),
            name: 'ADB Pro',
            replace: sinon.spy()
        } as unknown as vscode.OutputChannel;

        adbClient = new AdbClient(outputChannelStub);
        // Stub the private 'execute' method
        executeStub = sinon.stub(adbClient as any, 'execute');
    });

    teardown(() => {
        sinon.restore();
    });

    test('getConnectedDevices returns empty list when no devices', async () => {
        executeStub.resolves('List of devices attached\n');
        const devices = await adbClient.getConnectedDevices();
        assert.strictEqual(devices.length, 0);
    });

    test('getConnectedDevices parses wired device correctly', async () => {
        const output = `List of devices attached
emulator-5554 device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 device:emulator64_arm64 transport_id:1`;
        executeStub.resolves(output);

        const devices = await adbClient.getConnectedDevices();
        assert.strictEqual(devices.length, 1);
        assert.strictEqual(devices[0].id, 'emulator-5554');
        assert.strictEqual(devices[0].type, 'device');
        assert.strictEqual(devices[0].model, 'sdk_gphone64_arm64');
        assert.strictEqual(devices[0].connectionType, 'wired');
    });

    test('getConnectedDevices parses wireless device correctly', async () => {
        const output = `List of devices attached
192.168.1.5:5555 device product:bramble model:Pixel_4a__5G_ device:bramble transport_id:2`;
        executeStub.resolves(output);

        const devices = await adbClient.getConnectedDevices();
        assert.strictEqual(devices.length, 1);
        assert.strictEqual(devices[0].id, '192.168.1.5:5555');
        assert.strictEqual(devices[0].connectionType, 'wireless');
    });

    test('connectToDevice calls correct command', async () => {
        executeStub.resolves('connected to 192.168.1.5:5555');
        await adbClient.connectToDevice('192.168.1.5:5555');
        assert.ok(executeStub.calledWith('connect 192.168.1.5:5555'));
    });

    test('installApk calls correct command', async () => {
        executeStub.resolves('Success');
        await adbClient.installApk('device1', '/path/to/app.apk');
        assert.ok(executeStub.calledWith('-s device1 install -r "/path/to/app.apk"'));
    });

    test('uninstallApp calls correct command', async () => {
        executeStub.resolves('Success');
        await adbClient.uninstallApp('device1', 'com.example.app');
        assert.ok(executeStub.calledWith('-s device1 uninstall com.example.app'));
    });
});
