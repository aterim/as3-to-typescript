/**
 * User: nils.segebaden
 * Date: 2013-10-31
 */
package com.midasplayer.games.stitcheroo.v1.view_.tileview_
{
	import com.midasplayer.games.stitcheroo.v1.logic.Board;
	import com.midasplayer.games.stitcheroo.v1.logic.Tiles;
	import com.midasplayer.games.stitcheroo.v1.logic.math.Vec2;

	import com.midasplayer.games.stitcheroo.v1.logic.tile_.Idle;

	import com.midasplayer.games.stitcheroo.v1.logic.tile_.Tile;

	import com.midasplayer.games.stitcheroo.v1.time_.TimeView;

	import com.midasplayer.games.stitcheroo.v1.view_.BoardView;
	import com.midasplayer.games.stitcheroo.v1.view_.TouchHandler;

	import flash.geom.Point;

	import starling.display.Image;

	import starling.display.Sprite;

	public class TilePixel
	{
		public static const FallStartYOffset:Number = -620.0;
		public static const FlightForwardSpeed:Number = 30.0;
		public static var FlightMaxSideSpeed:Number;

		public static const C7GoInPixels:Number = 100;//30;//10.0;
		public static const C7GoOutPixels:Number = 20.0;
		public static const C7FlyPixels:Number = 900.0;//650.0;

		private var tile:Tile;
		public var tileView:TileView;

		internal var gridPixel:Vec2 = new Vec2(0, 0); // pixel that matches row and column that the tile belongs to, will land on, stop on...
		internal var pixel:Vec2 = new Vec2(0, 0);     // current pixel due to animations, fall etc
		private var leftEyePixel:Vec2 = new Vec2();
		private var rightEyePixel:Vec2 = new Vec2();

		private static const EyeOffset:Vec2 = new Vec2(-116, -104);
		private static const LeftOffset:Vec2 = new Vec2(24, 45);
		private static const RightOffset:Vec2 = new Vec2(57, 45);

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


		private var startPixel:Vec2 = new Vec2(0, 0);
		private var totalDistance:Vec2;

		private var fallWait:TimeView;
		private var fallTime:TimeView;
		private var flightTime:TimeView;
		private var flightDirection:Vec2 = new Vec2();
		private var combo7GoOut1:TimeView;
		private var combo7GoOut2:TimeView;
		private var combo7Fly:TimeView;
		private var combo7SlowGrowingAndStartTremble:TimeView;
		private var hintInView:TimeView;
		private var hintOutView:TimeView;
		private var hintInView2:TimeView;
		private var hintOutView2:TimeView;
		private var idle:Idle;
		private var failedMoveOutView:TimeView;
		private var failedMoveInView:TimeView;

		private var flightForwardSpeeed:Vec2 = new Vec2();
		private var flightForwardDeceleration:Number = 0.05;
		private var flightSidewaysDeceleration:Number = 0.02;
		private var flightSidewaysSpeed:Vec2 = new Vec2();

		private var combo7NearnessToCenter:Number;

		private var state:int;

		private var lastTick:Number = 0.0;

		private var combo7DirectionToCenter:Vec2;
		private var combo7FloatingPos:Vec2;

		//private var startRotation:Number;
		private var tileGraphic:TileGraphic;
		private var leftEye:Image;
		private var rightEye:Image;


		public function TilePixel(tv:TileView, tg:TileGraphic)
		{
			tileView = tv;
			tileGraphic = tg;

			tile = tileView.tile;
			fallWait = tileView.fallWait;
			fallTime = tileView.fallTime;
			flightTime = tileView.flightTime;
			combo7GoOut1 = tileView.tile.combo7Wave.goOut1.view;
			combo7GoOut2 = tileView.tile.combo7Wave.goOut2.view;
			combo7SlowGrowingAndStartTremble = tileView.tile.combo7Center.slowGrowingAndStartTremble.view;
			combo7Fly = tileView.tile.combo7Wave.fly.view;
			hintInView = tileView.tile.idle.hintIn.view;
			hintOutView = tileView.tile.idle.hintOut.view;
			hintInView2 = tileView.tile.idle.hintIn2.view;
			hintOutView2 = tileView.tile.idle.hintOut2.view;
			failedMoveOutView = tileView.tile.idle.failedMoveOut.view;
			failedMoveInView = tileView.tile.idle.failedMoveIn.view;
			idle = tileView.tile.idle;
			leftEye = tileGraphic.leftEye;
			rightEye = tileGraphic.rightEye;
		}

		public function update(tick:int, delta:Number):void
		{
			if (lastTick == -1)
			{
				lastTick = tick;
			}

			updateIdle(tick, delta);
			updateFall(tick, delta);
			updateMoveReverseAndBlast(tick, delta);
			updateExplode(tick, delta);
			updateFlight(tick, delta);
			updateRetract(tick, delta);
			updateCombo7Wave(tick, delta);
			updateCombo7Center(tick, delta);
			updateXy();

			lastTick = tick + delta;

			if (tileGraphic.graphicState == TileGraphic.Idle)
			{
				var distance:Number = pixel.add(LeftOffset).distance(TouchHandler.globalMouse);
				var minDistance:Number = BoardView.ColSpacing * 3.5;
				if (distance < minDistance)
				{
					var relativeDistance:Number = 0;
					if (distance > 0)
					{
						relativeDistance = (minDistance - distance)/minDistance;
					}

					var radians:Number = getMouseDirection(pixel.add(LeftOffset));
					var direction:Vec2 = new Vec2(3.5, 0);
					direction.rotateSelf(radians);
					direction.scaleSelf(relativeDistance);

					var rotPos:Vec2 = EyeOffset.add(direction);
					leftEye.x = rotPos.x;
					leftEye.y = rotPos.y;

					radians = getMouseDirection(pixel.add(RightOffset));
					direction.x = 3.5;
					direction.y = 0;
					direction.rotateSelf(radians);
					direction.scaleSelf(relativeDistance);

					rotPos = EyeOffset.add(direction);
					rightEye.x = rotPos.x;
					rightEye.y = rotPos.y;
				}
				else
				{
					leftEye.x = EyeOffset.x;
					leftEye.y = EyeOffset.y;
					rightEye.x = EyeOffset.x;
					rightEye.y = EyeOffset.y;
				}
			}
		}

		private function updateCombo7Center(tick:int, delta:Number):void
		{
			if (combo7SlowGrowingAndStartTremble.isRunning())
			{
				var shake:Vec2 = new Vec2();
				shake.x = Math.random() * 10.0 * combo7SlowGrowingAndStartTremble.rtp();
				shake.y = Math.random() * 10.0 * combo7SlowGrowingAndStartTremble.rtp();

				pixel.x = tile.getFloatingX() * BoardView.ColSpacing;
				pixel.y = tile.getFloatingY() * BoardView.RowSpacing;

				//var pos:Vec2 = pixel.clone();

				pixel.addSelf(shake);
				setPixel(pixel);
			}
			if (combo7SlowGrowingAndStartTremble.endsNow())
			{
				setPixel(tile.getPos());
			}
		}

		private function updateCombo7Wave(tick:int, delta:Number):void
		{
			var pos:Vec2;
			var rtp:Number;
			var rtl:Number;
			var deceleratedFlight:Number;
			if (combo7GoOut1.startsNow())
			{
				combo7FloatingPos = pixel.clone();
				var center:Vec2 = tile.combo7Wave.getCenter();
				BoardView.setPixel(center, center);
				combo7DirectionToCenter = center.sub(combo7FloatingPos);
				combo7DirectionToCenter.normalizeSelf();

				var distanceToCenter:Number = combo7FloatingPos.distance(tile.combo7Wave.getCenter());
				combo7NearnessToCenter = 1 - (distanceToCenter * (1 / (BoardView.ColSpacing * Tiles.Cols)));
				combo7NearnessToCenter = Math.pow(combo7NearnessToCenter, 5);
			}
			if (combo7FloatingPos != null && (combo7GoOut1.startsNow() || combo7GoOut1.isRunning()))
			{
				//rtp = combo7GoIn.rtp();
				rtp = 1 - Math.pow(combo7GoOut1.rtl(), 2);
				pos = combo7FloatingPos.sub(combo7DirectionToCenter.scale(rtp * C7GoInPixels * combo7NearnessToCenter)); //10
				setPixel(pos);
			}
			if (combo7GoOut2.isRunning())
			{
				rtp = 1 - Math.pow(combo7GoOut2.rtl(), 2);
				pos = combo7FloatingPos.sub(combo7DirectionToCenter.scale((rtp * 1.5) + C7GoInPixels * combo7NearnessToCenter)); //10
				setPixel(pos);
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

			if (combo7FloatingPos != null && (combo7Fly.startsNow() || combo7Fly.isRunning()))
			{
				pos = combo7FloatingPos.sub(combo7DirectionToCenter.scale(C7GoOutPixels)); // 20
				rtp = combo7Fly.rtp();
				rtl = combo7Fly.rtl();
				deceleratedFlight = 1.0 - (rtl * rtl);
				pos.subSelf(combo7DirectionToCenter.scale(deceleratedFlight * C7FlyPixels));
				setPixel(pos);
			}
		}

		private function updateRetract(tick:int, delta:Number):void
		{
			if (!tile.isRetracting())
			{
				return;
			}

			//tileView.tileGraphic.rightEye.visible = false;
			pixel.x = tile.getFloatingX() * BoardView.ColSpacing;
			pixel.y = tile.getFloatingY() * BoardView.RowSpacing;
			setPixel(pixel);
		}

		private function updateFlight(tick:int, delta:Number):void
		{
			if (!tile.isFlying())
			{
				return;
			}

			var passedTime:Number = tick + delta - lastTick;

			if (flightTime.startsNow())
			{
				updatePixelToGrid();
				var dir:Vec2 = tile.flight.direction;

				flightForwardSpeeed = dir.scale(15);
				var maybeInvert:int = -1.0;
				if (Math.random() > 0.5)
				{
					maybeInvert = 1.0;
				}
				flightSidewaysSpeed.x = maybeInvert * dir.y;
				flightSidewaysSpeed.y = maybeInvert * dir.x;
				flightSidewaysSpeed.scaleSelf(15);
			}


			var relativeDeceleration:Number = flightForwardDeceleration * passedTime;
			flightForwardSpeeed.scaleSelf(1 - relativeDeceleration);

			var rel2:Number = flightSidewaysDeceleration * passedTime;
			flightSidewaysSpeed.scaleSelf(1 - rel2);

			flightDirection = flightForwardSpeeed.add(flightSidewaysSpeed);

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

			pixel.addSelf(flightDirection);
			//updateXy();
			//pixel.x += 1;
			//pixel.y += 1;

		}

		private function updateExplode(tick:int, delta:Number):void
		{
			if (tile.isExploding())
			{
				if (tileView.stateChange)
				{
					updatePixelToGrid();
				}
			}
		}

		private function updateIdle(tick:int, delta:Number):void
		{
			
			if (tile.isIdle())
			{
				if (tileView.stateChange)
				{
					updatePixelToGrid();
				}

				var rtl:Number;
				var add_:Vec2;

				if (tileGraphic.graphicState == TileGraphic.Hint)
				{
					if (hintInView.isRunning())
					{
						pixel.x = tile.getFloatingX() * BoardView.ColSpacing;
						pixel.y = tile.getFloatingY() * BoardView.RowSpacing;
						rtl = hintInView.rtl();
						add_ = idle.hintDirection.scale((1 - rtl * rtl) * 10.0);
						pixel.addSelf(add_)
						setPixel(pixel);
					}
				}
			}
		}

		private function updateMoveReverseAndBlast(tick:int, delta:Number):void
		{
			if (tile.isMoving() || tile.isReversing() || tile.isBlasting())
			{
				pixel.x = tile.getFloatingX() * BoardView.ColSpacing;
				pixel.y = tile.getFloatingY() * BoardView.RowSpacing;
				setPixel(pixel);
			}
		}

		private function updateFall(tick:int, delta:Number):void
		{
			if (fallWait.startsNow())
			{
				tileView.myTrace("updateFall fallWait.startsNow() " + gridPixel + " " + pixel + " " + startPixel);

				updateGridPixel();

				startPixel.x = pixel.x -400;
				if (tile.getPos().x > 4)
				{
					startPixel.x = pixel.x + 450;
				}
				startPixel.y = pixel.y - 300;
				setPixel(startPixel);

				totalDistance = gridPixel.sub(startPixel);

				tileView.myTrace("fallWaitstartsNow2 " + gridPixel + " " + pixel + " " + startPixel);
			}

			if (fallTime.isRunning())
			{
				var deltaX:Number = totalDistance.x * fallTime.rtp();
				var squaredRtp:Number = fallTime.rtp() * fallTime.rtp();
				var deltaY:Number = totalDistance.y * squaredRtp;

				var nextPixel:Vec2 = new Vec2(startPixel.x + deltaX, startPixel.y + deltaY);
				setPixel(nextPixel);
				tileView.myTrace("fallTime running " + nextPixel);
			}

			if (fallTime.endsNow())
			{
				tileView.myTrace("fallTime endsNow ");
				updatePixelToGrid();
			}
		}

		public function updatePixelToGrid():void
		{
			updateGridPixel();
			setPixel(gridPixel);
			//tileView.myTrace("updatePixelToGrid " + gridPixel);
			updateXy();
		}

		/*public function getGridPixel():Vec2
		 {
		 return gridPixel.clone();
		 }*/

		private function updateGridPixel():void
		{
			BoardView.setPixel(tile.getPos(), gridPixel);
		}

		private function setPixel(newPixel:Vec2):void
		{
			pixel.x = newPixel.x;
			pixel.y = newPixel.y;
			//tileView.myTrace("setPixel " + newPixel);
		}

		private function updateXy():void
		{
			tileView.x = pixel.x;
			tileView.y = pixel.y;
			//tileView.myTrace("updateXy " + pixel);
		}

		public function init():void
		{
			combo7FloatingPos = null;
		}

		public function getMouseDirection(point:Vec2):Number {
			var radians:Number = 0;
			var opposite:Number = TouchHandler.globalMouse.x - point.x;//objPos.x;
			var adjacent:Number = TouchHandler.globalMouse.y - point.y;//objPos.y;
			radians = Math.atan2(adjacent, opposite);
			return radians;
		}
	}
}