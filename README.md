# www.hictorvugo.com.br

Portfólio estático bilíngue de Victor Hugo Sanches, publicado em
[www.hictorvugo.com.br](https://www.hictorvugo.com.br/).

## Estrutura

- `index.html`: página principal em português.
- `index-en.html`: página principal em inglês.
- `projetos/`: páginas detalhadas dos projetos.
- `assets/`: imagens, identidade visual e currículo.
- `scripts/portfolio.js`: interações, galerias e diálogos compartilhados.
- `styles.css`: ponto de entrada dos estilos.
- `css/foundation.css`: variáveis, reset e componentes estruturais.
- `css/portfolio.css`: home, galeria, navegação, animações e responsividade.
- `css/project-detail.css`: páginas internas, carrossel de telas e lightbox.

Os imports de `styles.css` devem permanecer na ordem atual, pois cada camada
refina a anterior pela cascata.

## Desenvolvimento

O site não exige compilação. Abra `index.html` diretamente ou sirva a pasta com
um servidor HTTP local:

```powershell
python -m http.server 8000
```

Para gerar novamente a imagem de compartilhamento social:

```powershell
npm ci
npm run generate:og
```

## Contato

- [Email](mailto:sawxor@icloud.com)
- [LinkedIn](https://www.linkedin.com/in/victor-hugo-sanches-4a6716290/)
- [GitHub](https://github.com/Sawxor19)
