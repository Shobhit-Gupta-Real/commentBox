export interface Chat {
    id: string,
    userId: string,
    name: string,
    message: string,
    upvotes: string[]
}

export abstract class Store {
    constructor() {

    }
    initRoom(roomId: string) {

    }
    getChats(roomId: string, limit: number, offset: number) {

    }
    addChat(userId: string, roomId: string, name: string, message: string, limit: number, offset: number) {

    }
    upvote(userId: string, roomId: string, chatId: string) {

    }
}