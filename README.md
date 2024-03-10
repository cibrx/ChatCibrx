# ChatCibrx

ChatCibrx is an open-source, localhost-running chat application built using Node.js, Express, EJS, and MongoDB. It's designed to facilitate real-time communication through both group and private messaging. The application includes a unique feature where the first user registered as 'admin' is automatically granted administrative privileges. Moreover, it hosts a bot within group chats, which users can interact with by issuing the `/help` command to discover more about the available commands and features.

<img src="https://github.com/LegendMan46/ChatCibrx/blob/master/public/img/indexAd.png">
## Features

- **Real-Time Messaging**: Support for both private and group chats.
- **Built-in Bot**: A chat bot available in group chats to guide users through commands and features.
- **Admin Privileges**: Automatic admin rights granted to the first user registered with the username 'admin'.
- **MongoDB Integration**: Utilizes MongoDB for data storage, ensuring a robust and scalable database solution.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

## Installation

Follow these steps to set up the ChatCibrx on your local machine:


```bash
git clone https://github.com/LegendMan46/ChatCibrx.git
cd ChatCibrx
npm install
```

The chat application will now be running at `http://localhost:3000`.

## Setting Up MongoDB Collections

Before starting the chat application, ensure the following collections are created in your MongoDB database:
- `users` - to store user registration and authentication information.
- `writeups` - for storing group chat messages or announcements.
- `messages_group` - to keep records of messages sent in group chats.
- `messages_private` - for storing private messages exchanged between users.

These collections will automatically be populated as you use the application.

## How to Use

After starting the application, navigate to `http://localhost:3000` on your web browser to access the ChatCibrx. Register as a new user, or log in if you already have an account, and explore the features available. Remember, the first user to register as 'admin' will receive administrative privileges.

## Contributing

We welcome contributions to ChatCibrx! If you have suggestions or improvements, please fork the repository and submit a pull request.

## License

ChatCibrx is licensed under the GNU General Public License (GPL), version 3. See the LICENSE file for more details.
   
   
