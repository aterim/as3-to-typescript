package com.midasplayer.games.candycrush
{
	import com.midasplayer.animation.tweenick.*;
	import com.midasplayer.engine.GameDataParser;
	import com.midasplayer.engine.render.IRenderableRoot;
	import com.midasplayer.engine.tick.ITickable;
	import com.midasplayer.games.candycrush.audio.AudioPlayer;
	import com.midasplayer.games.candycrush.audio.SoundVars;
	import com.midasplayer.games.candycrush.board.Board;
	import com.midasplayer.games.candycrush.board.IBoardListener;
	import com.midasplayer.games.candycrush.board.IDestructionPlan;
	import com.midasplayer.games.candycrush.board.Item;
	import com.midasplayer.games.candycrush.board.match.Match;
	import com.midasplayer.games.candycrush.input.SwapInfo;
	import com.midasplayer.games.candycrush.render.*;
	import com.midasplayer.games.candycrush.render.itemview.ItemView;
	import com.midasplayer.games.candycrush.utils.MCAnimation;
	import com.midasplayer.math.IntCoord;
	import com.midasplayer.sound.ManagedSound;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.DisplayObject;
	import flash.display.Sprite;
	import flash.events.MouseEvent;
	import flash.geom.Point;
	import flash.geom.Rectangle;
	import flash.utils.getTimer;

	/** Renders the game
	 *
	 *  Logic and Board pushes events to GameView / IBoardListener that this
	 *  class reacts to graphically.
	 * */
	public class GameView extends Sprite implements IRenderableRoot,
													IBoardListener,
													ITickable
	{
		public function GameView(gameDataParser:GameDataParser, tickTween:TickTween, isShortGame:Boolean)
		{
			_tweener = tickTween;
			_isShortGame = isShortGame;
			_gameDataParser = gameDataParser;
			_hintBoosterActive = BoosterPack.fromGameData(gameDataParser).isHintActive;

			_bgBitmap = new Bitmap(BackgroundBmd);

			addChild(_bgBitmap);

			//_bgCanvas = new Bitmap
			_canvas = new BitmapData(755, 600, true);
			_canvas.copyPixels(	_backgroundGlass,
										new Rectangle(0, 0, _backgroundGlass.width, _backgroundGlass.height),
										new Point(96, 7), null, null, false);
			_canvasBitmap = new Bitmap(_canvas);
			_canvasBitmapHolder = new Sprite();
			_canvasBitmapHolder.addChild(_canvasBitmap);
			addChild(_canvasBitmapHolder);

			//_nextLoopSoundTick = Ticks.sec2Ticks(10 + 15 * Math.random());
		}

		/** Intializes the GameView with a Logic to read state from */
		public function init(logic:Logic): void {
			_logic = logic;
			_ui = new Ui(_canvas, 0, _logic, _tweener);

			addChild(_ui.getBackDisplayObject());
		}

		/** The game is started!
		 *  This is supposed to be called when the Game State begins. This
		 *  stops intro music, start loop music, tween in UI and board */
		public function start(tweenTicks:int): void
		{
			SoundVars.music.fadeCurrentMusic(0, 2000, true);

			const loopMusic:ManagedSound = SoundVars.music.manager.getFromClass(SA_Music_loopwav2);
			loopMusic.loop( SoundVars.MusicVolume * 0.9 );

			SoundVars.music.setCurrentMusic( loopMusic );

			SoundVars.sound.play(SA_State_cleared);

			// Draw the glass (somewhere) and tween in the entities
			var glass:Bitmap = new Bitmap(_backgroundGlass);
			glass.x = 96;
			glass.y = 7;
			_canvasBitmapHolder.x = 755;
			_canvasBitmapHolder.addChildAt(glass, 0);

			const xdest:int = 0;
			const ttg:TTGroup = new TTGroup();
			ttg.add( new TTItem(_canvasBitmapHolder, 21, "x", xdest /*, { 'easing': TTEasing.QuadraticOut}*/ ) );
			ttg.addInTicks(tweenTicks-5, new TTItem(_canvasBitmapHolder, 3, "x", xdest, { 'start':xdest-4, 'easing':TTEasing.QuadraticOutReturner } ));
			ttg.addInTicks(tweenTicks-2, new TTItem(_canvasBitmapHolder, 2, "x", xdest, { 'start':xdest+2, 'easing':TTEasing.QuadraticOutReturner } ));
			_tweener.addGroup(ttg);

			// Tell the UI that it should be shown (tweened into screen)
			_ui.setLevel( _logic.getHumanReadableLevel() );
			_ui.show();
		}

		private var _firstGame:Boolean = true;

		/** A new round is started */
		public function newRound(tickId:int): void
		{
			if (_firstGame)
			{
				_firstGame = false;
			}
			
			while (numChildren > 3)
				removeChildAt(3);

			_sprites = new Vector.<TickedSprite>();
			_itemViews = new Vector.<ItemView>();
			_logic.getBoard().setListener(this);

			for each (var item:Item in _logic.getBoard()._allItems)
				addItem(item, item.x, item.y);

			_ui.setLevel(_logic.getHumanReadableLevel());
		}

		/** Converts a stage coordinate to a grid coordinate */
		static public function stageToGrid(x:int, y:int): IntCoord {
			return new IntCoord(Math.floor((x - 104 - 36) / 71.0 + 0.5),
								Math.floor((y - 17) / 63.0));
		}

		/** Converts a grid coordinate to a stage coordinate */
		static public function gridToStageX(x:Number): Number { return 140 + 71 * x; }
		static public function gridToStage(x:Number, y:Number): IntCoord {
			return new IntCoord( 104 + 36 + 71 * x, 17 + 63 * y);
		}

		public function getDisplayObject():DisplayObject { return this; }

		/** Should be called when rendering from the Outro (i.e. outside the Game state) */
		public function renderFromOutro(tick:int, alpha:Number): void { render(_lastTick, alpha); }

		/** Render the game */
		public function render(tick:int, alpha:Number):void
		{
			SoundVars.update();

			_tweener.render(alpha);
			updateFps();
			updateViews(tick + alpha);

			_canvas.lock();
			_canvas.fillRect(new Rectangle(0, 0, 755, 600), 0x00000000);
			//_canvas.copyPixels(_background, new Rectangle(0, 0, 755, 600), new Point(0, 0));

			//graphics.clear();

			drawMarkerBackground();
			sprites_render_back(tick, alpha);

			for each (var view:ItemView in _itemViews)
			{
				const item:Item = view.getItem();
				const color:int = item.color;
				view.renderAt(tick, alpha, _canvas);
			}
			drawMarkerForeground();

			sprites_render_front(tick, alpha);

			_ui._renderBack(tick, alpha);
			_canvas.unlock();

			if (_noMoreMovesPaper && _noMoreMovesPaper.parent && _noMoreMovesPaper.sprite)
				_noMoreMovesPaper.sprite.text.text = _gameDataParser.getText("game.nomoves");
		}

		/** Add a TickedSprite */
		private function sprites_add(s:TickedSprite): void
		{
			_sprites.push( s );

			if (s.addAndRemoveMe())
			{
				if (s.addAtFront())
					addChild(s.getFrontDisplayObject());
				if (s.addAtBack())
					addChildAt(s.getBackDisplayObject(), getChildIndex(_canvasBitmapHolder));
			}
		}

		/** Tick the TickedSprites */
		private function sprites_tick(tick:int): void
		{
			const keep:Vector.<TickedSprite> = new Vector.<TickedSprite>();
			for each (var s:TickedSprite in _sprites)
			{
				s.tick(tick);
				if (!s.isDone())
					keep.push( s );
				else
				{
					if (s.addAtFront())
						removeChild(s.getFrontDisplayObject());
					if (s.addAtBack())
						removeChild(s.getBackDisplayObject());
				}
			}
			 _sprites = keep;
		}
		/** Render the TickedSprites that's rendered in FRONT of the board Items */
		private function sprites_render_front(tick:int, alpha:Number):void
		{
			for each (var s:TickedSprite in _sprites)
				s._renderFront(tick, alpha);
		}

		/** Render the TickedSprites that's rendered BEHIND the board Items */
		private function sprites_render_back(tick:int, alpha:Number):void
		{
			for each (var s:TickedSprite in _sprites)
				s._renderBack(tick, alpha);
		}

		/** Draw the marker background */
		private function drawMarkerBackground():void
		{
			if (_logic.getSwapper().isMarked() && _logic.getBoard().isStable())
			{
				const markGrid:IntCoord = _logic.getSwapper().getMarkedPos();
				const item:Item = _logic.getBoard().getGridItem(markGrid.x, markGrid.y);
				if (!item || item.isDestroyed())
					return;
				
				const markWorld:IntCoord = GameView.gridToStage(markGrid.x, markGrid.y);
				_canvas.copyPixels(MarkerBackground, new Rectangle(0, 0, 73, 65), new Point(markWorld.x - 36, markWorld.y), null, null, true);
			}
		}

		/** Draw the marker foreground */
		private function drawMarkerForeground():void
		{
			if (_logic.getSwapper().isMarked() && _logic.getBoard().isStable())
			{
				const c:IntCoord = _logic.getSwapper().getMarkedPos();
				const item:Item = _logic.getBoard().getGridItem(c.x, c.y);
				if (!item || item.isDestroyed())
					return;

				const wc:IntCoord = GameView.gridToStage(c.x, c.y);
				_canvas.copyPixels(	MarkerForeground,
									new Rectangle(0, 0, 81, 73),
									new Point(wc.x - 41, wc.y - 5),
									null, null, true);
			}
		}

		private var _lastMs:int = -100000;
		private var _fps:int = 0;
		private var _fpsMeasures:int = 0;
		private var _fpsTotals:int = 0;
		/** Updates the FPS */
		private function updateFps():void
		{
			_fps++;

			const now:int = getTimer();
			if (now - _lastMs >= 1000)
			{
				//Main.Log.trace("Fps: " + _fps);
				trace("Current Fps: " + _fps);
				Main.Log.trace("Current Fps: " + _fps);

				_fpsTotals += _fps;
				_fpsMeasures++;

				_fps = 0;
				_lastMs = now;

				trace("Average Fps: " + getAverageFps());
				Main.Log.trace("Average Fps: " + getAverageFps());
			}
		}

		/** An item is added
		  * Adds an item graphically */
		public function addItem(e:Item, x:int, y:int): void
		{
			if (e.special == 0 && e.color == COLOR_NONE)
				return;

			const view:ItemView = new ItemView(e, _tweener);
			e.view = view;
			_itemViews.push( view );

			if (e.view.getSprite())
			{
				const atIndex:int = _canvasBitmapHolder.getChildIndex(_canvasBitmap);
				_canvasBitmapHolder.addChildAt(e.view.getSprite(), atIndex);
			}
		}

		/** Called when an item is Removed (and is now waiting to be fully destroyed) */
		public function removeItem(e:Item, x:int, y:int): void {
			for each (var view:ItemView in _itemViews)
				if (view.getItem() == e)
					view.remove();
		}

		/** Called when an item is Destroyed.
		 *  Note that an item can be destroyed without being removed (force-destroyed) */
		public function destroyItem(e:Item): void { if (e.view) e.view.destroy(); }

		/** Remove an item graphically from the scene by Item key */
		private function removeItemFromScene(e:Item): void {
			const index:int = _itemViews.indexOf(e);
			if (index >= 0)
				removeItemIndexFromScene(index);
		}

		/** Remove an item graphically from the scene by index */
		private function removeItemIndexFromScene(index:int): void {
			const s:Sprite = _itemViews.splice( index, 1)[0].getSprite();
			if (s) _canvasBitmapHolder.removeChild(s);
		}

		/** Update the views. Remove all ItemViews that are ready to be removed */
		public function updateViews(tick:Number): void {
			for (var i:int = _itemViews.length - 1; i >= 0; --i)
				if (_itemViews[i].doRemove())
					removeItemIndexFromScene(i);
		}

		private var _lastTick:int = 0;
		/** Tick the View */

		/** Should be called when ticking from the Outro (i.e. outside the Game state) */
		public function tickFromOutro(tick:int): void { this.tick(_lastTick + 1); }

		/** Ticks the view */
		public function tick(tick:int): void
		{
			_lastTick = tick;
			_tweener.tick(tick);

			tickHint(tick);
			_ui.tick(tick);

			if (_changeLevelTicks > 0)
			{
				--_changeLevelTicks;
				if (_changeLevelTicks == 0)
				{
					this.x = 0;
					this.y = 0;
				}
			}

			for each (var view:ItemView in _itemViews)
				view.tick(tick);

			sprites_tick(tick);

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

		private const HintPatternIds:Array = [Board.MATCH_ID_5, Board.MATCH_ID_TorL, Board.MATCH_ID_4];
		/** Tick graphical hints */
		private function tickHint(tick:int):void
		{
			if ( !_logic.getBoard().isStable() )
				return;
			if ( _logic.getTicksLeft() <= 0 )
				return;
			if (_changeLevelTicks > 0)
				return;

			// The normal hint that just shows a 3-match should be disabled if
			// booster hint is active AND it has found a better match
			var showSimpleHint:Boolean = true;

			if (_hintBoosterActive && (tick >= _baseBoosterHintTicks && (tick - _baseBoosterHintTicks) % 6 == 0))
			{
				const m:Match = _logic.getBoard().getSpecificHint( HintPatternIds );
				if (m) {
					showHintForMatch(m);
					showSimpleHint = false;
				}
			}

			// Show hint every 4 seconds (since board stabilized)
			if (showSimpleHint && (tick + 1 - _baseHintTicks) % Ticks.sec2Ticks(4) == 0)
			{
				const hints:Array = _logic.getBoard().getHint();
				if (hints)
					for each (var ic:IntCoord in hints)
						_logic.getBoard().getGridItem(ic.x, ic.y).view.showHint();
			}
		}

		private var _hintItems:Vector.<Item> = new Vector.<Item>();
		private function showHintForMatch(m:Match): void {
			if (!m || !m.associatedSwap) return;

			const board:Board = _logic.getBoard();
			const swap:SwapInfo = m.associatedSwap;
			const ticks:int = 6;

			var swap0IsNeeded:Boolean = false;
			for (var x:int = m.west; x <= m.east; ++x) {
				if (swap.x0 == x && swap.y0 == m.y) { swap0IsNeeded = true; continue; }
				if (swap.x1 == x && swap.y1 == m.y) continue;
				board.getGridItem(x, m.y).view.showBoosterHint(ticks);
			}
			for (var y:int = m.north; y <= m.south; ++y) {
				if (swap.x0 == m.x && swap.y0 == y) { swap0IsNeeded = true; continue; }
				if (swap.x1 == m.x && swap.y1 == y) continue;
				board.getGridItem(m.x, y).view.showBoosterHint(ticks);
			}
			if (swap0IsNeeded)  board.getGridItem(swap.x0, swap.y0).view.showBoosterHint(ticks);
				else			board.getGridItem(swap.x1, swap.y1).view.showBoosterHint(ticks);
		}

		/** Not used, just needed by ITickable */
		public function isDone(): Boolean { return false; }

		/**
		 * A Match has been made
		 * @param	m The Match
		 * @param	scoreSeq The sequence order, if only counting matches
		 * @param	feedbackSeq The sequence order, if blasted powerups are
		 *          counted as well (temporary stripe blasts excluded)
		 */
		public function hasMatched(m:Match, scoreSeq:int, feedbackSeq:int): void {
			playComboSound(scoreSeq, gridToStageX(m.x));
			//playFeedbackWord(feedbackSeq);
		}

		/** Play a Feedback word sound effect */
		private function playFeedbackWord(feedbackSeq:int):void
		{
			if (feedbackSeq == 4) SoundVars.sound.play( SA_Word_sweet_m9 );
			if (feedbackSeq == 6) SoundVars.sound.play( SA_Word_tasty_m9 );
			if (feedbackSeq == 9) SoundVars.sound.play( SA_Word_delicious_m10 );
			if (feedbackSeq == 12) SoundVars.sound.play( SA_Word_divine_m10 );
		}

		private var _sa_comboSounds:Array = [SA_Combo_1, SA_Combo_2, SA_Combo_3, SA_Combo_4, SA_Combo_5,
			SA_Combo_6, SA_Combo_7, SA_Combo_8, SA_Combo_9, SA_Combo_10, SA_Combo_11, SA_Combo_12];

		private function playComboSound(seq:int, panx:Number): void {
			if (seq < 1)
				return;

			const sound:Class = _sa_comboSounds[ int(Math.min(seq - 1, _sa_comboSounds.length - 1)) ];
			SoundVars.sound.play(sound, 1, panx);
		}

		/** A score has been added.
		 *  Shows a Score Popup with the given x,y position and color */
		private var _lastScoreAddedX:Number = x;
		private var _lastScoreAddedY:Number = y;
		public function addScore(x:Number, y:Number, color:int, theScore:int, item:Item=null, plan:IDestructionPlan = null): void
		{
			// Above screen, don't show any popups
			if (y < 0) return;

			if (Math.abs(x - _lastScoreAddedX) < 0.2 && Math.abs(y - _lastScoreAddedY) < 0.2) {
				x += x > _lastScoreAddedX? 0.5 : -0.5;
				y += y > _lastScoreAddedY? 0.5 : -0.5;
			}

			const c:IntCoord = gridToStage(x, y);
			sprites_add( new Fx_ScorePop(_lastTick, c.x, c.y, color, theScore) );

			_lastScoreAddedX = x;
			_lastScoreAddedY = y;
		}

		/**
		 * The Board has just fully stabilized
		 *
		 * @param	matchSequence The sequence order, if only counting matches
		 * @param	includingPowerupSequence The sequence order, if blasted
		 * 			powerups are counted as well (temporary stripe blasts excluded)
		 */
		public function boardStabilized(matchSequence:int, includingPowerupSequence:int): void
		{
			_baseHintTicks = _lastTick;
			_baseBoosterHintTicks = _lastTick + TicksPerBoosterHintStart;

			const seq:int = includingPowerupSequence;
			var text:String = "";
			var level:int = -1;
			var seq2:int;

			if (seq >= 12) 		{ level = 3; seq2 = 12; text = "Divine"; }
			else if (seq >= 9)	{ level = 2; seq2 = 9;  text = "Delicious"; }
			else if (seq >= 6)	{ level = 1; seq2 = 6;  text = "Tasty"; }
			else if (seq >= 4)	{ level = 0; seq2 = 4;  text = "Sweet"; }

			trace("level " + level + "(" + seq + ") ; " + text);

			if (text != "")
			{
				playFeedbackWord(seq2);
				sprites_add( new Fx_SequenceWord(_canvas, _lastTick, _tweener, level) );
			}
		}

		private var _z:int = 0;
		private var _lastWrapBlastTime:int = -99999;
		private var _lastColorBlastTime:int = -99999;
		private static var _sLastStripesBlastTime :int = -99999;

		/**
		 * A powerup has exploded
		 * @param	type The powerup type
		 * @param	x The x grid coordinate of the explosion
		 * @param	y The y grid coordinate of the explosion
		 * @param	item The exploded item
		 * @param	removeList A list of coordinates of removed items
		 * @param	removeItems A list of removed items
		 */
		public function powerupExploded(type:int, x:int, y:int, item:Item, removeList:Vector.<IntCoord> = null, removeItems:Vector.<Item> = null): void
		{
			const skipFeedbackIncrement:Boolean = item.isTemp() && (type == ItemType.COLUMN || type == ItemType.LINE);
			//if (!skipFeedbackIncrement)
				//playFeedbackWord( _logic.getScoreHolder().getFeedbackSequenceLength() );

			const now:int = getTimer();

			if (ItemType.isColor(type)) {
				if (now - _lastColorBlastTime > 200)
				{
					SoundVars.sound.play(SA_Explosion_color2, 1, gridToStageX(item.x));
					_lastColorBlastTime = now;
				}
			}

			if (ItemType.isStripes(type))
				playStripeSound(gridToStageX(item.x), skipFeedbackIncrement? 0.7 : 1);

			if (ItemType.isWrap(type)) {
				if (now - _lastWrapBlastTime > 200)
				{
					SoundVars.sound.play(SA_Explosion_bomb2, 1.2, gridToStageX(item.x));
					_lastWrapBlastTime = now;
				}
			}

			if (type == ItemType.WRAP)
				item.view.blast();

			if (type == ItemType.COLOR)
				sprites_add( new Fx_ColorBomb(_canvas, _lastTick, item, removeItems));

			if (type == ItemType.LINE)
				sprites_add( new Fx_LineColumn(_canvas, _lastTick, item));

			if (type == ItemType.COLUMN)
				sprites_add( new Fx_LineColumn(_canvas, _lastTick, item));
		}

		/** Play a strip explosion sound */
		public static function playStripeSound(x:Number, soundMult:Number = 1):void
		{
			const now:int = getTimer();

			if (now - _sLastStripesBlastTime > 200) {
				SoundVars.sound.play(SA_Explosion_stripes2, 0.8 * soundMult, x);
				_sLastStripesBlastTime = now;
			}
		}

		/** Specials have been mixed */
		public function specialMixed(type:int, swap:SwapInfo, removeItems:Vector.<Item> = null, center:IntCoord = null): void
		{
			if (ItemType.isColorLineMix(type)) {
				sprites_add( new Fx_Mix_ColorLine(_canvas, _lastTick, swap, removeItems));
				SoundVars.sound.play(SA_Mix_colorLine1, 1, AudioPlayer.PAN_CENTER);
			}

			if (ItemType.isLineWrapMix(type)) {
				sprites_add( new Fx_Mix_LineWrap(_canvas, _lastTick, /*center, */swap, removeItems));
				SoundVars.sound.play(SA_Mix_wrapLine1);
				SoundVars.sound.play(SA_Other_specialcandy2);
			}

			if (ItemType.isColorColorMix(type)) {
				//SoundVars.sound.play(SA_Mix_colorLine1, 0.75, AudioPlayer.PAN_CENTER, 300);
				//SoundVars.sound.play(SA_Mix_colorLine1, 0.75, AudioPlayer.PAN_CENTER, 1300);
				sprites_add( new Fx_Mix_ColorColor(_canvas, _lastTick, /*center, */swap, removeItems));
			}
		}

		/** Sugar Crush / Last Blast has begun */
		public function lastBlast():void
		{
			_ui.lastBlast();

			const board:Board = _logic.getBoard();
			for (var y:int = 0; y < board.height(); ++y)
			for (var x:int = 0; x < board.width(); ++x)
			{
				const item:Item = board.getGridItem(x, y);
				if (item && item.special > 0)
				{
					SoundVars.sound.play(SA_Word_sugarcrush_m6, 1.1);
					sprites_add( new Fx_SequenceWord(_canvas, _lastTick, _tweener, Fx_SequenceWord.LEVEL_LASTBLAST) );
					return;
				}
			}
		}

		/** Sets the removedItemsThisLevel/neededToRemoveToPassLevel quotaient */
		public function setRemovalShare(share:Number):void {
			_ui.setRemovalShare(share);
		}

		/** Prepare the next level (graphically) */
		public function changeLevel(ticksOut:int, ticksIn:int, waitTicks:int = 0):void
		{
			_maxChangeLevelTicks = ticksOut + ticksIn + waitTicks;
			_changeLevelTicks = ticksOut + ticksIn + waitTicks;
			_ui.levelComplete(_maxChangeLevelTicks);

			const ttg:TTGroup = new TTGroup();

			ttg.addInTicks(waitTicks, new TTItem( _canvasBitmapHolder, ticksOut-5, "x", 800, { 'easing':TTEasing.QuadraticIn } ));
			ttg.addInTicks(waitTicks + ticksOut + 10, new TTItem( _canvasBitmapHolder, ticksIn-5, "x", 0, { 'easing':TTEasing.QuadraticOut, 'start': 800 } ));

			_tweener.addGroup(ttg);
			SoundVars.sound.play(SA_State_cleared);
		}

		/** Game is over, the board should disappear */
		public function fadeOutBoard():void
		{
			if (_isShortGame || _fadeoutTick >= 0)
				return;

			_fadeoutTick = _lastTick;
			_fadeCoverBitmap = new Bitmap(BackgroundBmd);
			_fadeCoverBitmap.alpha = 0;

			const ttg:TTGroup = new TTGroup();
			//ttg.add( new TTItem( _canvasBitmapHolder, 20, "x", 800, { 'easing':TTEasing.QuadraticIn } ));
			ttg.addInTicks(10, new TTItem(_fadeCoverBitmap, 35, "alpha", 1));
			_tweener.addGroup(ttg);

			addChild( _fadeCoverBitmap );
			_ui.hide();
		}

		/** @return The average FPS */
		public function getAverageFps(): int
		{
			if (_fpsMeasures == 0) return 1;
			return _fpsTotals / _fpsMeasures;
		}

		/** No more moves is found */
		public function noMoreMoves():void
		{
			_noMoreMovesPaper = new GA_Paper_noMoreMoves();
			_noMoreMovesPaper.x = 248; // Read from FLA file
			_noMoreMovesPaper.y = 194; // Read from FLA file
			_noMoreMovesPaper.gotoAndStop(1);
			addChild(_noMoreMovesPaper);

			const anim:MCAnimation = new MCAnimation(_noMoreMovesPaper, false);

			const ttg:TTGroup = new TTGroup();
			ttg.add( new TTItem(anim, 56, "frame", 47) );
			ttg.add( new TTFunctionCall(57, function():void {
				if (_noMoreMovesPaper && _noMoreMovesPaper.parent)
				{
					_noMoreMovesPaper.parent.removeChild(_noMoreMovesPaper);
					_noMoreMovesPaper = null;
				}
			} ));
			_tweener.addGroup(ttg);

			SoundVars.sound.play(SA_State_nomoves);
		}

		/** Game Logic has stopped */
		public function stop(): void { fadeOutBoard(); }

		static public const COLOR_NONE:int = 0;
		static public const COLOR_BLUE:int = 1;
		static public const COLOR_GREEN:int = 2;
		static public const COLOR_ORANGE:int = 3;
		static public const COLOR_PURPLE:int = 4;
		static public const COLOR_RED:int = 5;
		static public const COLOR_YELLOW:int = 6;

		private var _itemViews:Vector.<ItemView>;
		
		private var _logic:Logic;

		private var _canvas:BitmapData;
		private var _canvasBitmap:Bitmap;

		//private var _background:BitmapData = new GA_Table_Background_base();
		static public const BackgroundBmd:BitmapData = new GA_Background_base();
		private var _backgroundGlass:BitmapData = new GA_Background_glass();

		/** @return The tweening engine */
		public function getTweener(): TickTween { return _tweener; }

		/** @return A powerup was created
		 *  @param special The special type
		 *  @param createdItem The actual created item */
		public function powerupCreated(special:int, createdItem:Item):void
		{
			if (ItemType.isWrap(special))
				SoundVars.sound.play(SA_Creation_wrap, 0.7);

			if (ItemType.isColor(special))
				SoundVars.sound.play(SA_Creation_color, 0.7);

			if (ItemType.isLine(special) || ItemType.isColumn(special))
				SoundVars.sound.play(SA_Creation_stripes, 0.7);
		}

		/**
		 * A switch was made or has begun
		 * @param	swapinfo The SwapInfo holding information about the switch
		 * @param	switchState The state of the switch (BEGIN, FAIL, SUCCESS)
		 */
		public function switchMade(swapinfo:SwapInfo, switchState:int):void
		{
			if (switchState == Board.SWITCHSTATE_BEGIN)
				SoundVars.sound.play(SA_Switch_sound);

			if (switchState == Board.SWITCHSTATE_FAIL)
				SoundVars.sound.play(SA_Switch_negative);

			//if (switchState == Board.SWITCHSTATE_SUCCESS)
				//SoundVars.sound.play(SA_Switch_???);
		}

		private var _tweener:TickTween;

		private var _sprites:Vector.<TickedSprite>;
		private var _baseHintTicks:int = 0;
		private var _baseBoosterHintTicks:int = 0;

		private static var MarkerBackground:BitmapData = new GA_Select_background();
		private static var MarkerForeground:BitmapData = new GA_Select_foreground();
		private var _ui:Ui;
		private var _changeLevelTicks:int = -1;
		private var _maxChangeLevelTicks:int;
		private var _bgBitmap:Bitmap;
		private var _canvasBitmapHolder:Sprite;
		private var _fadeoutTick:int = -1;
		private var _fadeCoverBitmap:Bitmap;
		private var _isShortGame:Boolean;
		private var _noMoreMovesPaper:GA_Paper_noMoreMoves;
		private var _gameDataParser:GameDataParser;

		private var _hintBoosterActive:Boolean = false;
		private const TicksPerBoosterHintStart:int = Ticks.sec2Ticks(0.2);
	}
}
