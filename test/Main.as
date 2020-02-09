package com.midasplayer.skill.framework
{
   import com.midasplayer.timing.ITickable;
   
   public class AbstractGame 
   {
       
	   public var c: Vector.<int>;

	   public var i: int;
      
      public function AbstractGame()
      {
         super();
		 this.commands = new Vector.<int>();

		 var k: int;
		 var r: int = 1;
      }
      
      public function isDone() : Boolean
      {
         return true;
      }
      
      override public function start() : void
      {
      }
      
      override public function stop() : void
      {
      }
      
      public function getScore() : int
      {
         return 0;
      }
      
      public function tick(tick:int) : void
      {
      }
      
      override public function render(tick:int, alpha:Number) : void
      {
      }
   }
}