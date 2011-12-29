
import flash.external.ExternalInterface;
import flash.media.Camera;
import flash.media.Video;
import flash.display.MovieClip;
import flash.system.Security;
import flash.display.BitmapData;
import flash.utils.ByteArray;

class Webcam {

	static var rawvideo:Video;

	static function main() {

		Security.allowDomain("*");
		haxe.Log.trace = function(v,?pos) { untyped __global__["trace"](pos.className+"#"+pos.methodName+"("+pos.lineNumber+"):",v); }

		rawvideo = getCameraVideo();
		if (rawvideo != null) {
			ExternalInterface.addCallback("capture", capture);
		} else {
			trace("No Camera");
		}
	}

	private static function getCameraVideo():Video {
		var cam:Camera;
		// OS X may not select proper webcam by default, needs a bit of help
		var id:Int = -1;
		for (i in 0...Camera.names.length) {
			if (Camera.names[i] == "USB Video Class Video" || Camera.names[i] == "Built-in iSight") {
				id = i;
				break;
			}
		}
		if (id > -1) {
			cam = Camera.getCamera(id+"");
		} else {
			cam = Camera.getCamera();
		}

		if (cam != null) {

			cam.setMode(320, 240, 24, false);
			cam.setQuality(0, 100);

			var mc:MovieClip = flash.Lib.current;
			var stage = flash.Lib.current.stage;
			stage.scaleMode = flash.display.StageScaleMode.NO_SCALE;
			var rawvideo:Video = new Video(Std.int(stage.width), Std.int(stage.height));
			rawvideo.attachCamera(cam);
			mc.addChild(rawvideo);
		    return rawvideo;
		}
		return null;
	}

	public static function capture() {
		var bitmap : BitmapData = new BitmapData(320, 240);
		bitmap.draw(rawvideo);
		var img:ByteArray = by.blooddy.crypto.image.JPEGEncoder.encode(bitmap, 80);
		ExternalInterface.call("onCapture", by.blooddy.crypto.Base64.encode(img));
	}

}
