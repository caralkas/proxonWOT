interface QPromise<T = any> {
  promise: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export class Queue {
  private queue: Array<QPromise> = [];

  private busy: boolean = false;

  public enqueue<T=void>(promise: ()=> Promise<T>): Promise<T>{
    return new Promise( (resolve, reject)=>{
        this.queue.push({  promise, resolve, reject });
        this.dequeue();    
    })
  }

  public async dequeue():Promise<boolean>{
    if (this.busy) return false;//Queue is currently being processed
    //Set busy
    this.busy = true;
    let elem = this.queue.shift();
    
    //Process the whole queue
    while (elem) {
        try {
            elem.resolve(await elem.promise());            
        } catch (error) {
            elem.reject(error);
        }                
        elem = this.queue.shift();
    }

    //Set idle
    this.busy = false;
    return true;
  }

//The below function is recursive. It keeps all calls until the last queue entry is processed.
//   public async dequeue():Promise<boolean>{
//     if (this.busy) return false;//Queue is currently being processed
//     const elem = this.queue.shift();
//     if (!elem) return true;//Queue is empty

//     this.busy = true;

//     try {
//         elem.resolve(await elem.promise());            
//     } catch (error) {
//         elem.reject(error);
//     }
    
//     this.busy = false;
//     return await this.dequeue();
//   }


}