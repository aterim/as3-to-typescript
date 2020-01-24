/**
 * User: nils.segebaden
 * Date: 2013-10-31
 */
module com.midasplayer.games.stitcheroo.v1.view_.tileview_
{

    import int = flash.utils.int;

	import Board = com.midasplayer.games.stitcheroo.v1.logic.Board;
	import Tiles = com.midasplayer.games.stitcheroo.v1.logic.Tiles;
	import Vec2 = com.midasplayer.games.stitcheroo.v1.logic.math.Vec2;

	import Idle = com.midasplayer.games.stitcheroo.v1.logic.tile_.Idle;

	import Tile = com.midasplayer.games.stitcheroo.v1.logic.tile_.Tile;

	import TimeView = com.midasplayer.games.stitcheroo.v1.time_.TimeView;

	import BoardView = com.midasplayer.games.stitcheroo.v1.view_.BoardView;
	import TouchHandler = com.midasplayer.games.stitcheroo.v1.view_.TouchHandler;

	import Point = flash.geom.Point;

	import Image = starling.display.Image;

	import Sprite = starling.display.Sprite;

	export class TilePixel
	{
		public static FallStartYOffset:number = -620.0;
		public static FlightForwardSpeed:number = 30.0;
		public static FlightMaxSideSpeed:number;

		public static C7GoInPixels:number = 100;//30;//10.0;
		public static C7GoOutPixels:number = 20.0;
		public static C7FlyPixels:number = 900.0;//650.0;

		private tile:Tile;
		public tileView:TileView;

		/*internal*/ gridPixel:Vec2 = new Vec2(0, 0); // pixel that matches row and column that the tile belongs to, will land on, stop on...
		/*internal*/ pixel:Vec2 = new Vec2(0, 0);     // current pixel due to animations, fall etc
		private leftEyePixel:Vec2 = new Vec2();
		private rightEyePixel:Vec2 = new Vec2();

		private static EyeOffset:Vec2 = new Vec2(-116, -104);
		private static LeftOffset:Vec2 = new Vec2(24, 45);
		private static RightOffset:Vec2 = new Vec2(57, 45);

		/*private static const LeftEyeOffsets:Vector.<Vec2> = Vector.<Vec2>([new Vec2(10, 10),
			new Vec2(10, 10),
			new Vec2(10, 10),
			new Vec2(10, 10),
			new Vec2(10, 10),
			new Vec2(10, 10)]);

		private static const RightEyeOffsets:Vector.<Vec2> = Vector.<Vec2>([new Vec2(10, 20),
			new Vec2(10, 20),
			new Vec2(10, 20),
			new Vec2(10, 20),
			new Vec2(10, 20),
			new Vec2(10, 20)]);*/


		private startPixel:Vec2 = new Vec2(0, 0);
		private totalDistance:Vec2;

		private fallWait:TimeView;
		private fallTime:TimeView;
		private flightTime:TimeView;
		private flightDirection:Vec2 = new Vec2();
		private combo7GoOut1:TimeView;
		private combo7GoOut2:TimeView;
		private combo7Fly:TimeView;
		private combo7SlowGrowingAndStartTremble:TimeView;
		private hintInView:TimeView;
		private hintOutView:TimeView;
		private hintInView2:TimeView;
		private hintOutView2:TimeView;
		private idle:Idle;
		private failedMoveOutView:TimeView;
		private failedMoveInView:TimeView;

		private flightForwardSpeeed:Vec2 = new Vec2();
		private flightForwardDeceleration:number = 0.05;
		private flightSidewaysDeceleration:number = 0.02;
		private flightSidewaysSpeed:Vec2 = new Vec2();

		private combo7NearnessToCenter:number;

		private state:integer;

		private lastTick:number = 0.0;

		private combo7DirectionToCenter:Vec2;
		private combo7FloatingPos:Vec2;

		//private var startRotation:Number;
		private tileGraphic:TileGraphic;
		private leftEye:Image;
		private rightEye:Image;


		constructor(tv:TileView, tg:TileGraphic)
		{
			this.tileView = tv;
			this.tileGraphic = tg;

			this.tile = this.tileView.tile;
			this.fallWait = this.tileView.fallWait;
			this.fallTime = this.tileView.fallTime;
			this.flightTime = this.tileView.flightTime;
			this.combo7GoOut1 = this.tileView.tile.combo7Wave.goOut1.view;
			this.combo7GoOut2 = this.tileView.tile.combo7Wave.goOut2.view;
			this.combo7SlowGrowingAndStartTremble = this.tileView.tile.combo7Center.slowGrowingAndStartTremble.view;
			this.combo7Fly = this.tileView.tile.combo7Wave.fly.view;
			this.hintInView = this.tileView.tile.idle.hintIn.view;
			this.hintOutView = this.tileView.tile.idle.hintOut.view;
			this.hintInView2 = this.tileView.tile.idle.hintIn2.view;
			this.hintOutView2 = this.tileView.tile.idle.hintOut2.view;
			this.failedMoveOutView = this.tileView.tile.idle.failedMoveOut.view;
			this.failedMoveInView = this.tileView.tile.idle.failedMoveIn.view;
			this.idle = this.tileView.tile.idle;
			this.leftEye = this.tileGraphic.leftEye;
			this.rightEye = this.tileGraphic.rightEye;
		}

		public update(tick:integer, delta:number):void
		{
			if (this.lastTick == -1)
			{
				this.lastTick = int.int(tick);
			}

			this.updateIdle(int.int(tick), delta);
			this.updateFall(int.int(tick), delta);
			this.updateMoveReverseAndBlast(int.int(tick), delta);
			this.updateExplode(int.int(tick), delta);
			this.updateFlight(int.int(tick), delta);
			this.updateRetract(int.int(tick), delta);
			this.updateCombo7Wave(int.int(tick), delta);
			this.updateCombo7Center(int.int(tick), delta);
			this.updateXy();

			this.lastTick = int.int(tick) + delta;

			if (this.tileGraphic.graphicState == this.TileGraphic.Idle)
			{
				var distance:number = this.pixel.add(TilePixel.LeftOffset).distance(TouchHandler.globalMouse);
				var minDistance:number = BoardView.ColSpacing * 3.5;
				if (distance < minDistance)
				{
					var relativeDistance:number = 0;
					if (distance > 0)
					{
						relativeDistance = (minDistance - distance)/minDistance;
					}

					var radians:number = this.getMouseDirection(this.pixel.add(TilePixel.LeftOffset));
					var direction:Vec2 = new Vec2(3.5, 0);
					direction.rotateSelf(radians);
					direction.scaleSelf(relativeDistance);

					var rotPos:Vec2 = TilePixel.EyeOffset.add(direction);
					this.leftEye.x = rotPos.x;
					this.leftEye.y = rotPos.y;

					radians = this.getMouseDirection(this.pixel.add(TilePixel.RightOffset));
					direction.x = 3.5;
					direction.y = 0;
					direction.rotateSelf(radians);
					direction.scaleSelf(relativeDistance);

					rotPos = TilePixel.EyeOffset.add(direction);
					this.rightEye.x = rotPos.x;
					this.rightEye.y = rotPos.y;
				}
				else
				{
					this.leftEye.x = TilePixel.EyeOffset.x;
					this.leftEye.y = TilePixel.EyeOffset.y;
					this.rightEye.x = TilePixel.EyeOffset.x;
					this.rightEye.y = TilePixel.EyeOffset.y;
				}
			}
		}

		private updateCombo7Center(tick:integer, delta:number):void
		{
			if (this.combo7SlowGrowingAndStartTremble.isRunning())
			{
				var shake:Vec2 = new Vec2();
				shake.x = Math.random() * 10.0 * this.combo7SlowGrowingAndStartTremble.rtp();
				shake.y = Math.random() * 10.0 * this.combo7SlowGrowingAndStartTremble.rtp();

				this.pixel.x = this.tile.getFloatingX() * BoardView.ColSpacing;
				this.pixel.y = this.tile.getFloatingY() * BoardView.RowSpacing;

				//var pos:Vec2 = pixel.clone();

				this.pixel.addSelf(shake);
				this.setPixel(this.pixel);
			}
			if (this.combo7SlowGrowingAndStartTremble.endsNow())
			{
				this.setPixel(this.tile.getPos());
			}
		}

		private updateCombo7Wave(tick:integer, delta:number):void
		{
			var pos:Vec2;
			var rtp:number;
			var rtl:number;
			var deceleratedFlight:number;
			if (this.combo7GoOut1.startsNow())
			{
				this.combo7FloatingPos = this.pixel.clone();
				var center:Vec2 = this.tile.combo7Wave.getCenter();
				BoardView.setPixel(center, center);
				this.combo7DirectionToCenter = center.sub(this.combo7FloatingPos);
				this.combo7DirectionToCenter.normalizeSelf();

				var distanceToCenter:number = this.combo7FloatingPos.distance(this.tile.combo7Wave.getCenter());
				this.combo7NearnessToCenter = 1 - (distanceToCenter * (1 / (BoardView.ColSpacing * Tiles.Cols)));
				this.combo7NearnessToCenter = Math.pow(this.combo7NearnessToCenter, 5);
			}
			if (this.combo7FloatingPos != null && (this.combo7GoOut1.startsNow() || this.combo7GoOut1.isRunning()))
			{
				//rtp = combo7GoIn.rtp();
				rtp = 1 - Math.pow(this.combo7GoOut1.rtl(), 2);
				pos = this.combo7FloatingPos.sub(this.combo7DirectionToCenter.scale(rtp * TilePixel.C7GoInPixels * this.combo7NearnessToCenter)); //10
				this.setPixel(pos);
			}
			if (this.combo7GoOut2.isRunning())
			{
				rtp = 1 - Math.pow(this.combo7GoOut2.rtl(), 2);
				pos = this.combo7FloatingPos.sub(this.combo7DirectionToCenter.scale((rtp * 1.5) + TilePixel.C7GoInPixels * this.combo7NearnessToCenter)); //10
				this.setPixel(pos);
			}
			/*if (combo7GoOut.startsNow())
			{
				//combo7FloatingPos = pixel.clone();
				//var center:Vec2 = tile.combo7Wave.getCenter();
				BoardView.setPixel(center, center);
				combo7DirectionToCenter = center.sub(combo7FloatingPos);
				combo7DirectionToCenter.normalizeSelf();
			}
			if (combo7FloatingPos != null && (combo7GoOut.startsNow() || combo7GoOut.isRunning()))
			{
				//trace("out");
				//pos = combo7FloatingPos.add(combo7DirectionToCenter.scale(C7GoInPixels));  //10
				if (pos == null)
				{
					pos = combo7FloatingPos.clone();
				}
				rtp = combo7GoOut.rtp();
				pos.subSelf(combo7DirectionToCenter.scale(rtp * rtp * C7GoOutPixels)); //20
				setPixel(pos);
			}*/

			if (this.combo7FloatingPos != null && (this.combo7Fly.startsNow() || this.combo7Fly.isRunning()))
			{
				pos = this.combo7FloatingPos.sub(this.combo7DirectionToCenter.scale(TilePixel.C7GoOutPixels)); // 20
				rtp = this.combo7Fly.rtp();
				rtl = this.combo7Fly.rtl();
				deceleratedFlight = 1.0 - (rtl * rtl);
				pos.subSelf(this.combo7DirectionToCenter.scale(deceleratedFlight * TilePixel.C7FlyPixels));
				this.setPixel(pos);
			}
		}

		private updateRetract(tick:integer, delta:number):void
		{
			if (!this.tile.isRetracting())
			{
				return;
			}

			//tileView.tileGraphic.rightEye.visible = false;
			this.pixel.x = this.tile.getFloatingX() * BoardView.ColSpacing;
			this.pixel.y = this.tile.getFloatingY() * BoardView.RowSpacing;
			this.setPixel(this.pixel);
		}

		private updateFlight(tick:integer, delta:number):void
		{
			if (!this.tile.isFlying())
			{
				return;
			}

			var passedTime:number = int.int(tick) + delta - this.lastTick;

			if (this.flightTime.startsNow())
			{
				this.updatePixelToGrid();
				var dir:Vec2 = this.tile.flight.direction;

				this.flightForwardSpeeed = dir.scale(15);
				var maybeInvert:integer = -1.0;
				if (Math.random() > 0.5)
				{
					maybeInvert = int.int( 1.0);
				}
				this.flightSidewaysSpeed.x = int.int(maybeInvert) * dir.y;
				this.flightSidewaysSpeed.y = int.int(maybeInvert) * dir.x;
				this.flightSidewaysSpeed.scaleSelf(15);
			}


			var relativeDeceleration:number = this.flightForwardDeceleration * passedTime;
			this.flightForwardSpeeed.scaleSelf(1 - relativeDeceleration);

			var rel2:number = this.flightSidewaysDeceleration * passedTime;
			this.flightSidewaysSpeed.scaleSelf(1 - rel2);

			this.flightDirection = this.flightForwardSpeeed.add(this.flightSidewaysSpeed);

			/*if (flightTime.startsNow())
			{
				updatePixelToGrid();
				var dir:Vec2 = tile.flight.direction;
				flightDirection.copy(dir);
				flightDirection.scaleSelf(TilePixel.FlightForwardSpeed);
				var rotation:Number = Math.PI / 2;
				rotation *= Math.random();
				rotation -= Math.PI / 4;
				flightDirection.rotateSelf(rotation);
			}*/

			this.pixel.addSelf(this.flightDirection);
			//updateXy();
			//pixel.x += 1;
			//pixel.y += 1;

		}

		private updateExplode(tick:integer, delta:number):void
		{
			if (this.tile.isExploding())
			{
				if (this.tileView.stateChange)
				{
					this.updatePixelToGrid();
				}
			}
		}

		private updateIdle(tick:integer, delta:number):void
		{
			
			if (this.tile.isIdle())
			{
				if (this.tileView.stateChange)
				{
					this.updatePixelToGrid();
				}

				var rtl:number;
				var add_:Vec2;

				if (this.tileGraphic.graphicState == this.TileGraphic.Hint)
				{
					if (this.hintInView.isRunning())
					{
						this.pixel.x = this.tile.getFloatingX() * BoardView.ColSpacing;
						this.pixel.y = this.tile.getFloatingY() * BoardView.RowSpacing;
						rtl = this.hintInView.rtl();
						add_ = this.idle.hintDirection.scale((1 - rtl * rtl) * 10.0);
						this.pixel.addSelf(add_)
						this.setPixel(this.pixel);
					}
				}
			}
		}

		private updateMoveReverseAndBlast(tick:integer, delta:number):void
		{
			if (this.tile.isMoving() || this.tile.isReversing() || this.tile.isBlasting())
			{
				this.pixel.x = this.tile.getFloatingX() * BoardView.ColSpacing;
				this.pixel.y = this.tile.getFloatingY() * BoardView.RowSpacing;
				this.setPixel(this.pixel);
			}
		}

		private updateFall(tick:integer, delta:number):void
		{
			if (this.fallWait.startsNow())
			{
				this.tileView.myTrace("updateFall fallWait.startsNow() " + this.gridPixel + " " + this.pixel + " " + this.startPixel);

				this.updateGridPixel();

				this.startPixel.x = this.pixel.x -400;
				if (this.tile.getPos().x > 4)
				{
					this.startPixel.x = this.pixel.x + 450;
				}
				this.startPixel.y = this.pixel.y - 300;
				this.setPixel(this.startPixel);

				this.totalDistance = this.gridPixel.sub(this.startPixel);

				this.tileView.myTrace("fallWaitstartsNow2 " + this.gridPixel + " " + this.pixel + " " + this.startPixel);
			}

			if (this.fallTime.isRunning())
			{
				var deltaX:number = this.totalDistance.x * this.fallTime.rtp();
				var squaredRtp:number = this.fallTime.rtp() * this.fallTime.rtp();
				var deltaY:number = this.totalDistance.y * squaredRtp;

				var nextPixel:Vec2 = new Vec2(this.startPixel.x + deltaX, this.startPixel.y + deltaY);
				this.setPixel(nextPixel);
				this.tileView.myTrace("fallTime running " + nextPixel);
			}

			if (this.fallTime.endsNow())
			{
				this.tileView.myTrace("fallTime endsNow ");
				this.updatePixelToGrid();
			}
		}

		public updatePixelToGrid():void
		{
			this.updateGridPixel();
			this.setPixel(this.gridPixel);
			//tileView.myTrace("updatePixelToGrid " + gridPixel);
			this.updateXy();
		}

		/*public function getGridPixel():Vec2
		 {
		 return gridPixel.clone();
		 }*/

		private updateGridPixel():void
		{
			BoardView.setPixel(this.tile.getPos(), this.gridPixel);
		}

		private setPixel(newPixel:Vec2):void
		{
			this.pixel.x = newPixel.x;
			this.pixel.y = newPixel.y;
			//tileView.myTrace("setPixel " + newPixel);
		}

		private updateXy():void
		{
			this.tileView.x = this.pixel.x;
			this.tileView.y = this.pixel.y;
			//tileView.myTrace("updateXy " + pixel);
		}

		public init():void
		{
			this.combo7FloatingPos = null;
		}

		public getMouseDirection(point:Vec2):number {
			var radians:number = 0;
			var opposite:number = TouchHandler.globalMouse.x - point.x;//objPos.x;
			var adjacent:number = TouchHandler.globalMouse.y - point.y;//objPos.y;
			radians = Math.atan2(adjacent, opposite);
			return radians;
		}
	}
}