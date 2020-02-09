module com.midasplayer.skill.framework
{

    import int = flash.utils.int;

   import ITickable = com.midasplayer.timing.ITickable;
   
   export class AbstractGame 
   {
       
	   public c: integer[];

	   public i: integer = 0;
      
      constructor()
      {
         super();
		 this.commands = new Array<integer>();

		 var k: integer = 0;
		 var r: integer = 1;
      }
      
      public isDone() : boolean
      {
         return true;
      }
      
      /*override*/ public start() : void
      {
      }
      
      /*override*/ public stop() : void
      {
      }
      
      public getScore() : integer
      {
         return 0;
      }
      
      public tick(tick:integer) : void
      {
      }
      
      /*override*/ public render(tick:integer, alpha:number) : void
      {
      }
   }
}