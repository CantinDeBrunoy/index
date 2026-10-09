import { portfolioLink } from '@index/projects';
import { mountIndexBar } from '@index/ui/index-bar';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import './style/index.scss';
import App from './app.router';

// Onglet « ← Index » vers la fiche du jeu sur le portfolio : en haut à gauche, le seul coin que ni le
// menu, ni l'inventaire, ni le chronomètre n'occupent.
mountIndexBar({ ...portfolioLink('galactic-escape'), corner: 'top-left' });

ReactDOM.render(
    <Router>
        <App />
    </Router>,
    document.getElementById('root'),
);
