# Smart Simple Task Tracker (SSTT)

A distributed single-task system designed for focused work with Chrome Tab Groups.

## Live Page on GitHub Pages
Visit [SSTT Page](https://stefanibus.github.io/smart-simple-task-tracker) to get started.

Use one "SSTT Page" to manage 'all your thoughts and tasks' related to a single Chrome-Tab-Group.

Since you’ll likely have multiple Tab Groups open, we recommend placing each Tab Group in its own Chrome window. (though it’s not required)  

**Rule of thumb:** one Tab Group → one SSTT Page to manage all  of your thoughts and tasks inside of that specific Tab-Group.

## Architecture Overview 

- **One STT per Chrome Tab Group**: Each tab group represents one topic/project
- **Cross-tab Communication**: Real-time sync via localStorage event bus
- **URL Parameter Sync**: Task data shared via URL for easy sharing and Chrome sync
- **Keystroke-aware Updates**: Real-time synchronization triggered by typing activity

## Features

- ✅ Single task focus per tab group
- ✅ Cross-window task awareness
- ✅ Due date tracking with visual indicators
- ✅ Real-time synchronization
- ✅ Backup/restore functionality
- ✅ Mobile Chrome sync compatibility
- ✅ URL-based task sharing

## Development Setup

```bash
npm install
npm start
```

## Project Structure

```
├── index.html          # Main application interface
├── script.js           # Core application logic
├── styles.css          # Application styling
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Branching Strategy

- `main` - Stable, production-ready code
- `development` - Integration branch for testing features
- `fix/*` - Bug fixes and code cleanup
- `feature/*` - New functionality
- `refactor/*` - Code improvements and restructuring

## Contributing

1. Create feature branch from `development`
2. Make focused, atomic commits
3. Test thoroughly before merging
4. Use descriptive commit messages

## Technical Details

- **Unique ID System**: Each window gets `win_xxxxxxxxx` identifier
- **Storage Keys**: `pageTitle_win_xxx`, `details_win_xxx`, `dueDate_win_xxx`
- **Priority System**: URL parameters override localStorage
- **Sync Mechanism**: localStorage event bus + URL parameter sharing

## Keyboard Shortcuts

- `Ctrl+S` - Save backup
- `Ctrl+R` - Refresh task list  
- `Esc` - Clear focus

## Browser Compatibility

Optimized for Chrome with Tab Groups. Works in other modern browsers but Chrome Tab Group sync is the intended workflow.