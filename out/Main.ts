module com.midasplayer.games.candycrush
{

    import int = flash.utils.int;

	import * = com.midasplayer.animation.tweenick.*;
	import GameDataParser = com.midasplayer.engine.GameDataParser;
	import IRenderableRoot = com.midasplayer.engine.render.IRenderableRoot;
	import ITickable = com.midasplayer.engine.tick.ITickable;
	import AudioPlayer = com.midasplayer.games.candycrush.audio.AudioPlayer;
	import SoundVars = com.midasplayer.games.candycrush.audio.SoundVars;
	import Board = com.midasplayer.games.candycrush.board.Board;
	import IBoardListener = com.midasplayer.games.candycrush.board.IBoardListener;
	import IDestructionPlan = com.midasplayer.games.candycrush.board.IDestructionPlan;
	import Item = com.midasplayer.games.candycrush.board.Item;
	import Match = com.midasplayer.games.candycrush.board.match.Match;
	import SwapInfo = com.midasplayer.games.candycrush.input.SwapInfo;
	import * = com.midasplayer.games.candycrush.render.*;
	import ItemView = com.midasplayer.games.candycrush.render.itemview.ItemView;
	import MCAnimation = com.midasplayer.games.candycrush.utils.MCAnimation;
	import IntCoord = com.midasplayer.math.IntCoord;
	import ManagedSound = com.midasplayer.sound.ManagedSound;
	import Bitmap = flash.display.Bitmap;
	import BitmapData = flash.display.BitmapData;
	import DisplayObject = flash.display.DisplayObject;
	import Sprite = flash.display.Sprite;
	import MouseEvent = flash.events.MouseEvent;
	import Point = flash.geom.Point;
	import Rectangle = flash.geom.Rectangle;
	import getTimer = flash.utils.getTimer;

	/** Renders the game
	 *
	 *  Logic and Board pushes events to GameView / IBoardListener that this
	 *  class reacts to graphically.
	 * */
	export class GameView extends Sprite implements IRenderableRoot,
													IBoardListener,
													ITickable
	{
		constructor(gameDataParser:GameDataParser, tickTween:TickTween, isShortGame:boolean)
		{
			this._tweener = tickTween;
			this._isShortGame = isShortGame;
			this._gameDataParser = gameDataParser;
			this._hintBoosterActive = this.BoosterPack.fromGameData(gameDataParser).isHintActive;

			this._bgBitmap = new Bitmap(GameView.BackgroundBmd);

			this.addChild(this._bgBitmap);

			//_bgCanvas = new Bitmap
			this._canvas = new BitmapData(755, 600, true);
			this._canvas.copyPixels(	this._backgroundGlass,
										new Rectangle(0, 0, this._backgroundGlass.width, this._backgroundGlass.height),
										new Point(96, 7), null, null, false);
			this._canvasBitmap = new Bitmap(this._canvas);
			this._canvasBitmapHolder = new Sprite();
			this._canvasBitmapHolder.addChild(this._canvasBitmap);
			this.addChild(this._canvasBitmapHolder);

			//_nextLoopSoundTick = Ticks.sec2Ticks(10 + 15 * Math.random());
		}

		/** Intializes the GameView with a Logic to read state from */
		public init(logic:Logic): void {
			this._logic = logic;
			this._ui = new Ui(this._canvas, 0, this._logic, this._tweener);

			this.addChild(this._ui.getBackDisplayObject());
		}

		/** The game is started!
		 *  This is supposed to be called when the Game State begins. This
		 *  stops intro music, start loop music, tween in UI and board */
		public start(tweenTicks:integer): void
		{
			SoundVars.music.fadeCurrentMusic(0, 2000, true);

			var loopMusic:ManagedSound = SoundVars.music.manager.getFromClass(this.SA_Music_loopwav2);
			loopMusic.loop( SoundVars.MusicVolume * 0.9 );

			SoundVars.music.setCurrentMusic( loopMusic );

			SoundVars.sound.play(this.SA_State_cleared);

			// Draw the glass (somewhere) and tween in the entities
			var glass:Bitmap = new Bitmap(this._backgroundGlass);
			glass.x = 96;
			glass.y = 7;
			this._canvasBitmapHolder.x = 755;
			this._canvasBitmapHolder.addChildAt(glass, 0);

			var xdest:integer = 0;
			var ttg:TTGroup = new TTGroup();
			ttg.add( new TTItem(this._canvasBitmapHolder, 21, "x", int.int(xdest) /*, { 'easing': TTEasing.QuadraticOut}*/ ) );
			ttg.addInTicks(int.int(tweenTicks)-5, new TTItem(this._canvasBitmapHolder, 3, "x", int.int(xdest), { 'start':xdest-4int.int(, 'ea)sing':TTEasing.QuadraticOutReturner this.} ));
			ttg.addInTicks(int.int(tweenTicks)-2, new TTItem(this._canvasBitmapHolder, 2, "x", int.int(xdest), { 'start':xdest+2int.int(, 'ea)sing':TTEasing.QuadraticOutReturner this.} ));
			this._tweener.addGroup(ttg);

			// Tell the UI that it should be shown (tweened into screen)
			this._ui.setLevel( this._logic.getHumanReadableLevel() );
			this._ui.show();
		}

		private _firstGame:boolean = true;

		/** A new round is started */
		public newRound(tickId:integer): void
		{
			if (this._firstGame)
			{
				this._firstGame = false;
			}
			
			while (this.numChildren > 3)
				this.removeChildAt(3);

			this._sprites = new Array<TickedSprite>();
			this._itemViews = new Array<ItemView>();
			this._logic.getBoard().setListener(this);

			for each (var item:Item in this._logic.getBoard()._allItems)
				this.addItem(item, item.x, item.y);

			this._ui.setLevel(this._logic.getHumanReadableLevel());
		}

		/** Converts a stage coordinate to a grid coordinate */
		public static stageToGrid(x:integer, y:integer): IntCoord {
			return new IntCoord(Math.floor((int.int(x) - 104 - 36) / 71.0 + 0.5),
								Math.floor((int.int(y) - 17) / 63.0));
		}

		/** Converts a grid coordinate to a stage coordinate */
		public static gridToStageX(x:number): number { return 140 + 71 * x; }
		public static gridToStage(x:number, y:number): IntCoord {
			return new IntCoord( 104 + 36 + 71 * x, 17 + 63 * y);
		}

		public getDisplayObject():DisplayObject { return this; }

		/** Should be called when rendering from the Outro (i.e. outside the Game state) */
		public renderFromOutro(tick:integer, alpha:number): void { this.render(this._lastTick, alpha); }

		/** Render the game */
		public render(tick:integer, alpha:number):void
		{
			SoundVars.update();

			this._tweener.render(alpha);
			this.updateFps();
			this.updateViews(int.int(tick) + alpha);

			this._canvas.lock();
			this._canvas.fillRect(new Rectangle(0, 0, 755, 600), 0x00000000);
			//_canvas.copyPixels(_background, new Rectangle(0, 0, 755, 600), new Point(0, 0));

			//graphics.clear();

			this.drawMarkerBackground();
			this.sprites_render_back(int.int(tick), alpha);

			for each (var view:ItemView in this._itemViews)
			{
				var item:Item = view.getItem();
				var color:integer = item.color;
				view.renderAt(int.int(tick), alpha, this._canvas);
			}
			this.drawMarkerForeground();

			this.sprites_render_front(int.int(tick), alpha);

			this._ui._renderBack(int.int(tick), alpha);
			this._canvas.unlock();

			if (this._noMoreMovesPaper && this._noMoreMovesPaper.parent && this._noMoreMovesPaper.sprite)
				this._noMoreMovesPaper.sprite.text.text = this._gameDataParser.getText("game.nomoves");
		}

		/** Add a TickedSprite */
		private sprites_add(s:TickedSprite): void
		{
			this._sprites.push( s );

			if (s.addAndRemoveMe())
			{
				if (s.addAtFront())
					this.addChild(s.getFrontDisplayObject());
				if (s.addAtBack())
					this.addChildAt(s.getBackDisplayObject(), this.getChildIndex(this._canvasBitmapHolder));
			}
		}

		/** Tick the TickedSprites */
		private sprites_tick(tick:integer): void
		{
			var keep:TickedSprite[] = new Array<TickedSprite>();
			for each (var s:TickedSprite in this._sprites)
			{
				s.tick(int.int(tick));
				if (!s.isDone())
					keep.push( s );
				else
				{
					if (s.addAtFront())
						this.removeChild(s.getFrontDisplayObject());
					if (s.addAtBack())
						this.removeChild(s.getBackDisplayObject());
				}
			}
			 this._sprites = keep;
		}
		/** Render the TickedSprites that's rendered in FRONT of the board Items */
		private sprites_render_front(tick:integer, alpha:number):void
		{
			for each (var s:TickedSprite in this._sprites)
				s._renderFront(int.int(tick), alpha);
		}

		/** Render the TickedSprites that's rendered BEHIND the board Items */
		private sprites_render_back(tick:integer, alpha:number):void
		{
			for each (var s:TickedSprite in this._sprites)
				s._renderBack(int.int(tick), alpha);
		}

		/** Draw the marker background */
		private drawMarkerBackground():void
		{
			if (this._logic.getSwapper().isMarked() && this._logic.getBoard().isStable())
			{
				var markGrid:IntCoord = this._logic.getSwapper().getMarkedPos();
				var item:Item = this._logic.getBoard().getGridItem(markGrid.x, markGrid.y);
				if (!item || item.isDestroyed())
					return;
				
				var markWorld:IntCoord = GameView.gridToStage(markGrid.x, markGrid.y);
				this._canvas.copyPixels(GameView.MarkerBackground, new Rectangle(0, 0, 73, 65), new Point(markWorld.x - 36, markWorld.y), null, null, true);
			}
		}

		/** Draw the marker foreground */
		private drawMarkerForeground():void
		{
			if (this._logic.getSwapper().isMarked() && this._logic.getBoard().isStable())
			{
				var c:IntCoord = this._logic.getSwapper().getMarkedPos();
				var item:Item = this._logic.getBoard().getGridItem(c.x, c.y);
				if (!item || item.isDestroyed())
					return;

				var wc:IntCoord = GameView.gridToStage(c.x, c.y);
				this._canvas.copyPixels(	GameView.MarkerForeground,
									new Rectangle(0, 0, 81, 73),
									new Point(wc.x - 41, wc.y - 5),
									null, null, true);
			}
		}

		private _lastMs:integer = -100000;
		private _fps:integer = 0;
		private _fpsMeasures:integer = 0;
		private _fpsTotals:integer = 0;
		/** Updates the FPS */
		private updateFps():void
		{
			this._fps++;

			var now:integer = getTimer();
			if (int.int(now) - this._lastMs >= 1000)
			{
				//Main.Log.trace("Fps: " + _fps);
				console.log("Current Fps: " + this._fps);
				this.Main.Log.trace("Current Fps: " + this._fps);

				this._fpsTotals += int.int( int.int(this._fps));
				this._fpsMeasures++;

				this._fps = int.int( 0);
				this._lastMs = int.int( int.int(now));

				console.log("Average Fps: " + this.getAverageFps());
				this.Main.Log.trace("Average Fps: " + this.getAverageFps());
			}
		}

		/** An item is added
		  * Adds an item graphically */
		public addItem(e:Item, x:integer, y:integer): void
		{
			if (e.special == 0 && e.color == GameView.COLOR_NONE)
				return;

			var view:ItemView = new ItemView(e, this._tweener);
			e.view = view;
			this._itemViews.push( view );

			if (e.view.getSprite())
			{
				var atIndex:integer = this._canvasBitmapHolder.getChildIndex(this._canvasBitmap);
				this._canvasBitmapHolder.addChildAt(e.view.getSprite(), int.int(atIndex));
			}
		}

		/** Called when an item is Removed (and is now waiting to be fully destroyed) */
		public removeItem(e:Item, x:integer, y:integer): void {
			for each (var view:ItemView in this._itemViews)
				if (view.getItem() == e)
					view.remove();
		}

		/** Called when an item is Destroyed.
		 *  Note that an item can be destroyed without being removed (force-destroyed) */
		public destroyItem(e:Item): void { if (e.view) e.view.destroy(); }

		/** Remove an item graphically from the scene by Item key */
		private removeItemFromScene(e:Item): void {
			var index:integer = this._itemViews.indexOf(e);
			if (int.int(index) >= 0)
				this.removeItemIndexFromScene(int.int(index));
		}

		/** Remove an item graphically from the scene by index */
		private removeItemIndexFromScene(index:integer): void {
			var s:Sprite = this._itemViews.splice( int.int(index), 1)[0].getSprite();
			if (s) this._canvasBitmapHolder.removeChild(s);
		}

		/** Update the views. Remove all ItemViews that are ready to be removed */
		public updateViews(tick:number): void {
			for (var i:integer = this._itemViews.length - 1; int.int(i) >= 0; --i)
				if (this._itemViews[i].doRemove())
					this.removeItemIndexFromScene(int.int(i));
		}

		private _lastTick:integer = 0;
		/** Tick the View */

		/** Should be called when ticking from the Outro (i.e. outside the Game state) */
		public tickFromOutro(tick:integer): void { this.tick(this._lastTick + 1); }

		/** Ticks the view */
		public tick(tick:integer): void
		{
			this._lastTick = int.int( int.int(tick));
			this._tweener.tick(int.int(tick));

			this.tickHint(int.int(tick));
			this._ui.tick(int.int(tick));

			if (this._changeLevelTicks > 0)
			{
				--this._changeLevelTicks;
				if (this._changeLevelTicks == 0)
				{
					this.x = 0;
					this.y = 0;
				}
			}

			for each (var view:ItemView in this._itemViews)
				view.tick(int.int(tick));

			this.sprites_tick(int.int(tick));

			/*
			if (tick % 30 == 29)
			{
				for (var i:int = 0; i < 2; ++i)
				{
					const ci:Item = new Item(4, i, 1 + Math.random() * 6);
					ci.special = Math.random()<0.01? ItemType.COLUMN : ItemType.LINE;
					//sprites_add( new Fx_LineColumn(_canvas, tick, ci) );
					sprites_add( new Fx_Mix_LineWrap(_canvas, tick, new SwapInfo(3, 4, 3, 5, new Item(3, 4, 1), new Item(3, 5, 2)), new Vector.<Item>()) );
				}
				//);
			}
			/**/

			/*
			if (tick % 60 == 0)
				addChild( new GA_Stars_groupAnimated() ).x = 200;
				*/
			//if (tick % 60 == 0) sprites_add( new Fx_SequenceWord(_canvas, tick, _tweener, Math.random()*4) );
		}

		private HintPatternIds:any[] = [Board.MATCH_ID_5, Board.MATCH_ID_TorL, Board.MATCH_ID_4];
		/** Tick graphical hints */
		private tickHint(tick:integer):void
		{
			if ( !this._logic.getBoard().isStable() )
				return;
			if ( this._logic.getTicksLeft() <= 0 )
				return;
			if (this._changeLevelTicks > 0)
				return;

			// The normal hint that just shows a 3-match should be disabled if
			// booster hint is active AND it has found a better match
			var showSimpleHint:boolean = true;

			if (this._hintBoosterActive && (int.int(tick) >= this._baseBoosterHintTicks && (int.int(tick) - this._baseBoosterHintTicks) % 6 == 0))
			{
				var m:Match = this._logic.getBoard().getSpecificHint( this.HintPatternIds );
				if (m) {
					this.showHintForMatch(m);
					showSimpleHint = false;
				}
			}

			// Show hint every 4 seconds (since board stabilized)
			if (showSimpleHint && (int.int(tick) + 1 - this._baseHintTicks) % this.Ticks.sec2Ticks(4) == 0)
			{
				var hints:any[] = this._logic.getBoard().getHint();
				if (hints)
					for each (var ic:IntCoord in hints)
						this._logic.getBoard().getGridItem(ic.x, ic.y).view.showHint();
			}
		}

		private _hintItems:Item[] = new Array<Item>();
		private showHintForMatch(m:Match): void {
			if (!m || !m.associatedSwap) return;

			var board:Board = this._logic.getBoard();
			var swap:SwapInfo = m.associatedSwap;
			var ticks:integer = 6;

			var swap0IsNeeded:boolean = false;
			for (var x:integer = m.west; int.int(x) <= m.east; ++x) {
				if (swap.x0 == x && swap.y0 == m.y) { swap0IsNeeded = true; continue; }
				if (swap.x1 == x && swap.y1 == m.y) continue;
				board.getGridItem(int.int(x), m.y).view.showBoosterHint(int.int(ticks));
			}
			for (var y:integer = m.north; int.int(y) <= m.south; ++y) {
				if (swap.x0 == m.x && swap.y0 == y) { swap0IsNeeded = true; continue; }
				if (swap.x1 == m.x && swap.y1 == y) continue;
				board.getGridItem(m.x, int.int(y)).view.showBoosterHint(int.int(ticks));
			}
			if (swap0IsNeeded)  board.getGridItem(swap.x0, swap.y0).view.showBoosterHint(int.int(ticks));
				else			board.getGridItem(swap.x1, swap.y1).view.showBoosterHint(int.int(ticks));
		}

		/** Not used, just needed by ITickable */
		public isDone(): boolean { return false; }

		/**
		 * A Match has been made
		 * @param	m The Match
		 * @param	scoreSeq The sequence order, if only counting matches
		 * @param	feedbackSeq The sequence order, if blasted powerups are
		 *          counted as well (temporary stripe blasts excluded)
		 */
		public hasMatched(m:Match, scoreSeq:integer, feedbackSeq:integer): void {
			this.playComboSound(int.int(scoreSeq), GameView.gridToStageX(m.x));
			//playFeedbackWord(feedbackSeq);
		}

		/** Play a Feedback word sound effect */
		private playFeedbackWord(feedbackSeq:integer):void
		{
			if (feedbackSeq == 4) SoundVars.sound.play( this.SA_Word_sweet_m9 );
			if (feedbackSeq == 6) SoundVars.sound.play( this.SA_Word_tasty_m9 );
			if (feedbackSeq == 9) SoundVars.sound.play( this.SA_Word_delicious_m10 );
			if (feedbackSeq == 12) SoundVars.sound.play( this.SA_Word_divine_m10 );
		}

		private _sa_comboSounds:any[] = [this.SA_Combo_1, this.SA_Combo_2, this.SA_Combo_3, this.SA_Combo_4, this.SA_Combo_5,
			this.SA_Combo_6, this.SA_Combo_7, this.SA_Combo_8, this.SA_Combo_9, this.SA_Combo_10, this.SA_Combo_11, this.SA_Combo_12];

		private playComboSound(seq:integer, panx:number): void {
			if (int.int(seq) < 1)
				return;

			var sound:Class = this._sa_comboSounds[ int.int(Math.min(int.int(seq) - 1, this._sa_comboSounds.length - 1)) ];
			SoundVars.sound.play(sound, 1, panx);
		}

		/** A score has been added.
		 *  Shows a Score Popup with the given x,y position and color */
		private _lastScoreAddedX:number = this.x;
		private _lastScoreAddedY:number = this.y;
		public addScore(x:number, y:number, color:integer, theScore:integer, item:Item=null, plan:IDestructionPlan = null): void
		{
			// Above screen, don't show any popups
			if (y < 0) return;

			if (Math.abs(x - this._lastScoreAddedX) < 0.2 && Math.abs(y - this._lastScoreAddedY) < 0.2) {
				x += x > this._lastScoreAddedX? 0.5 : -0.5;
				y += y > this._lastScoreAddedY? 0.5 : -0.5;
			}

			var c:IntCoord = GameView.gridToStage(x, y);
			this.sprites_add( new Fx_ScorePop(this._lastTick, c.x, c.y, int.int(color), int.int(theScore)) );

			this._lastScoreAddedX = x;
			this._lastScoreAddedY = y;
		}

		/**
		 * The Board has just fully stabilized
		 *
		 * @param	matchSequence The sequence order, if only counting matches
		 * @param	includingPowerupSequence The sequence order, if blasted
		 * 			powerups are counted as well (temporary stripe blasts excluded)
		 */
		public boardStabilized(matchSequence:integer, includingPowerupSequence:integer): void
		{
			this._baseHintTicks = int.int( int.int(this._lastTick));
			this._baseBoosterHintTicks = int.int( this._lastTick + this.TicksPerBoosterHintStart);

			var seq:integer = int.int(includingPowerupSequence);
			var text:string = "";
			var level:integer = -1;
			var seq2:integer;

			if (int.int(seq) >= 12) 		{ level = int.int( 3); seq2 = int.int( 12); text = "Divine"; }
			else if (int.int(seq) >= 9)	{ level = int.int( 2); seq2 = int.int( 9);  text = "Delicious"; }
			else if (int.int(seq) >= 6)	{ level = int.int( 1); seq2 = int.int( 6);  text = "Tasty"; }
			else if (int.int(seq) >= 4)	{ level = int.int( 0); seq2 = int.int( 4);  text = "Sweet"; }

			console.log("level " + int.int(level) + "(" + int.int(seq) + ") ; " + text);

			if (text != "")
			{
				this.playFeedbackWord(int.int(seq2));
				this.sprites_add( new Fx_SequenceWord(this._canvas, this._lastTick, this._tweener, int.int(level)) );
			}
		}

		private _z:integer = 0;
		private _lastWrapBlastTime:integer = -99999;
		private _lastColorBlastTime:integer = -99999;
		private static _sLastStripesBlastTime :integer = -99999;

		/**
		 * A powerup has exploded
		 * @param	type The powerup type
		 * @param	x The x grid coordinate of the explosion
		 * @param	y The y grid coordinate of the explosion
		 * @param	item The exploded item
		 * @param	removeList A list of coordinates of removed items
		 * @param	removeItems A list of removed items
		 */
		public powerupExploded(type:integer, x:integer, y:integer, item:Item, removeList:IntCoord[] = null, removeItems:Item[] = null): void
		{
			var skipFeedbackIncrement:boolean = item.isTemp() && (type == this.ItemType.COLUMN || type == this.ItemType.LINE);
			//if (!skipFeedbackIncrement)
				//playFeedbackWord( _logic.getScoreHolder().getFeedbackSequenceLength() );

			var now:integer = getTimer();

			if (this.ItemType.isColor(int.int(type))) {
				if (int.int(now) - this._lastColorBlastTime > 200)
				{
					SoundVars.sound.play(this.SA_Explosion_color2, 1, GameView.gridToStageX(item.x));
					this._lastColorBlastTime = int.int( int.int(now));
				}
			}

			if (this.ItemType.isStripes(int.int(type)))
				GameView.playStripeSound(GameView.gridToStageX(item.x), skipFeedbackIncrement? 0.7 : 1);

			if (this.ItemType.isWrap(int.int(type))) {
				if (int.int(now) - this._lastWrapBlastTime > 200)
				{
					SoundVars.sound.play(this.SA_Explosion_bomb2, 1.2, GameView.gridToStageX(item.x));
					this._lastWrapBlastTime = int.int( int.int(now));
				}
			}

			if (type == this.ItemType.WRAP)
				item.view.blast();

			if (type == this.ItemType.COLOR)
				this.sprites_add( new Fx_ColorBomb(this._canvas, this._lastTick, item, removeItems));

			if (type == this.ItemType.LINE)
				this.sprites_add( new Fx_LineColumn(this._canvas, this._lastTick, item));

			if (type == this.ItemType.COLUMN)
				this.sprites_add( new Fx_LineColumn(this._canvas, this._lastTick, item));
		}

		/** Play a strip explosion sound */
		public static playStripeSound(x:number, soundMult:number = 1):void
		{
			var now:integer = getTimer();

			if (int.int(now) - GameView._sLastStripesBlastTime > 200) {
				SoundVars.sound.play(this.SA_Explosion_stripes2, 0.8 * soundMult, x);
				GameView._sLastStripesBlastTime = int.int( int.int(now));
			}
		}

		/** Specials have been mixed */
		public specialMixed(type:integer, swap:SwapInfo, removeItems:Item[] = null, center:IntCoord = null): void
		{
			if (this.ItemType.isColorLineMix(int.int(type))) {
				this.sprites_add( new Fx_Mix_ColorLine(this._canvas, this._lastTick, swap, removeItems));
				SoundVars.sound.play(this.SA_Mix_colorLine1, 1, AudioPlayer.PAN_CENTER);
			}

			if (this.ItemType.isLineWrapMix(int.int(type))) {
				this.sprites_add( new Fx_Mix_LineWrap(this._canvas, this._lastTick, /*center, *this./swap, removeItems));
				SoundVars.sound.play(this.SA_Mix_wrapLine1);
				SoundVars.sound.play(this.SA_Other_specialcandy2);
			}

			if (this.ItemType.isColorColorMix(int.int(type))) {
				//SoundVars.sound.play(SA_Mix_colorLine1, 0.75, AudioPlayer.PAN_CENTER, 300);
				//SoundVars.sound.play(SA_Mix_colorLine1, 0.75, AudioPlayer.PAN_CENTER, 1300);
				this.sprites_add( new Fx_Mix_ColorColor(this._canvas, this._lastTick, /*center, *this./swap, removeItems));
			}
		}

		/** Sugar Crush / Last Blast has begun */
		public lastBlast():void
		{
			this._ui.lastBlast();

			var board:Board = this._logic.getBoard();
			for (var y:integer = 0; int.int(y) < board.height(); ++y)
			for (var x:integer = 0; int.int(x) < board.width(); ++x)
			{
				var item:Item = board.getGridItem(int.int(x), int.int(y));
				if (item && item.special > 0)
				{
					SoundVars.sound.play(this.SA_Word_sugarcrush_m6, 1.1);
					this.sprites_add( new Fx_SequenceWord(this._canvas, this._lastTick, this._tweener, this.Fx_SequenceWord.LEVEL_LASTBLAST) );
					return;
				}
			}
		}

		/** Sets the removedItemsThisLevel/neededToRemoveToPassLevel quotaient */
		public setRemovalShare(share:number):void {
			this._ui.setRemovalShare(share);
		}

		/** Prepare the next level (graphically) */
		public changeLevel(ticksOut:integer, ticksIn:integer, waitTicks:integer = 0):void
		{
			this._maxChangeLevelTicks = int.int( int.int(ticksOut) + int.int(ticksIn) + int.int(waitTicks));
			this._changeLevelTicks = int.int( int.int(ticksOut) + int.int(ticksIn) + int.int(waitTicks));
			this._ui.levelComplete(this._maxChangeLevelTicks);

			var ttg:TTGroup = new TTGroup();

			ttg.addInTicks(int.int(waitTicks), new TTItem( this._canvasBitmapHolder, int.int(ticksOut)-5, "x", 800, { 'easing':TTEasing.QuadraticIn this.} ));
			ttg.addInTicks(int.int(waitTicks) + int.int(ticksOut) + 10, new TTItem( this._canvasBitmapHolder, int.int(ticksIn)-5, "x", 0, { 'easing':TTEasing.QuadraticOutthis., 'start': 800 } ));

			this._tweener.addGroup(ttg);
			SoundVars.sound.play(this.SA_State_cleared);
		}

		/** Game is over, the board should disappear */
		public fadeOutBoard():void
		{
			if (this._isShortGame || this._fadeoutTick >= 0)
				return;

			this._fadeoutTick = int.int( int.int(this._lastTick));
			this._fadeCoverBitmap = new Bitmap(GameView.BackgroundBmd);
			this._fadeCoverBitmap.alpha = 0;

			var ttg:TTGroup = new TTGroup();
			//ttg.add( new TTItem( _canvasBitmapHolder, 20, "x", 800, { 'easing':TTEasing.QuadraticIn } ));
			ttg.addInTicks(10, new TTItem(this._fadeCoverBitmap, 35, "alpha", 1));
			this._tweener.addGroup(ttg);

			this.addChild( this._fadeCoverBitmap );
			this._ui.hide();
		}

		/** @return The average FPS */
		public getAverageFps(): integer
		{
			if (this._fpsMeasures == 0) return 1;
			return this._fpsTotals / this._fpsMeasures;
		}

		/** No more moves is found */
		public noMoreMoves():void
		{
			this._noMoreMovesPaper = new GA_Paper_noMoreMoves();
			this._noMoreMovesPaper.x = 248; // Read from FLA file
			this._noMoreMovesPaper.y = 194; // Read from FLA file
			this._noMoreMovesPaper.gotoAndStop(1);
			this.addChild(this._noMoreMovesPaper);

			var anim:MCAnimation = new MCAnimation(this._noMoreMovesPaper, false);

			var ttg:TTGroup = new TTGroup();
			ttg.add( new TTItem(anim, 56, "frame", 47) );
			ttg.add( new TTFunctionCall(57, function():void {
				if (this._noMoreMovesPaper && this._noMoreMovesPaper.parent)
				{
					this._noMoreMovesPaper.parent.removeChild(this._noMoreMovesPaper);
					this._noMoreMovesPaper = null;
				}
			} ));
			this._tweener.addGroup(ttg);

			SoundVars.sound.play(this.SA_State_nomoves);
		}

		/** Game Logic has stopped */
		public stop(): void { this.fadeOutBoard(); }

		public static COLOR_NONE:integer = 0;
		public static COLOR_BLUE:integer = 1;
		public static COLOR_GREEN:integer = 2;
		public static COLOR_ORANGE:integer = 3;
		public static COLOR_PURPLE:integer = 4;
		public static COLOR_RED:integer = 5;
		public static COLOR_YELLOW:integer = 6;

		private _itemViews:ItemView[];
		
		private _logic:Logic;

		private _canvas:BitmapData;
		private _canvasBitmap:Bitmap;

		//private var _background:BitmapData = new GA_Table_Background_base();
		public static BackgroundBmd:BitmapData = new GA_Background_base();
		private _backgroundGlass:BitmapData = new GA_Background_glass();

		/** @return The tweening engine */
		public getTweener(): TickTween { return this._tweener; }

		/** @return A powerup was created
		 *  @param special The special type
		 *  @param createdItem The actual created item */
		public powerupCreated(special:integer, createdItem:Item):void
		{
			if (this.ItemType.isWrap(int.int(special)))
				SoundVars.sound.play(this.SA_Creation_wrap, 0.7);

			if (this.ItemType.isColor(int.int(special)))
				SoundVars.sound.play(this.SA_Creation_color, 0.7);

			if (this.ItemType.isLine(int.int(special)) || this.ItemType.isColumn(int.int(special)))
				SoundVars.sound.play(this.SA_Creation_stripes, 0.7);
		}

		/**
		 * A switch was made or has begun
		 * @param	swapinfo The SwapInfo holding information about the switch
		 * @param	switchState The state of the switch (BEGIN, FAIL, SUCCESS)
		 */
		public switchMade(swapinfo:SwapInfo, switchState:integer):void
		{
			if (switchState == Board.SWITCHSTATE_BEGIN)
				SoundVars.sound.play(this.SA_Switch_sound);

			if (switchState == Board.SWITCHSTATE_FAIL)
				SoundVars.sound.play(this.SA_Switch_negative);

			//if (switchState == Board.SWITCHSTATE_SUCCESS)
				//SoundVars.sound.play(SA_Switch_???);
		}

		private _tweener:TickTween;

		private _sprites:TickedSprite[];
		private _baseHintTicks:integer = 0;
		private _baseBoosterHintTicks:integer = 0;

		private static MarkerBackground:BitmapData = new GA_Select_background();
		private static MarkerForeground:BitmapData = new GA_Select_foreground();
		private _ui:Ui;
		private _changeLevelTicks:integer = -1;
		private _maxChangeLevelTicks:integer;
		private _bgBitmap:Bitmap;
		private _canvasBitmapHolder:Sprite;
		private _fadeoutTick:integer = -1;
		private _fadeCoverBitmap:Bitmap;
		private _isShortGame:boolean;
		private _noMoreMovesPaper:GA_Paper_noMoreMoves;
		private _gameDataParser:GameDataParser;

		private _hintBoosterActive:boolean = false;
		private TicksPerBoosterHintStart:integer = this.Ticks.sec2Ticks(0.2);
	}
}
