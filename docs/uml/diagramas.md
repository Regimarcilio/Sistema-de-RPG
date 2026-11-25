# Diagramas UML — Sistema de RPG (Mermaid)

Este arquivo reúne os 4 diagramas UML do projeto em sintaxe **Mermaid** (compatível com GitHub, GitLab, VS Code, Notion e Mermaid Live Editor).

## 1. Diagrama de Classes

```mermaid
classDiagram
    direction TB

    class IUsavel {
        <<interface>>
        +usar(alvo: Personagem) string
    }

    class Item {
        <<abstract>>
        +TIPO: string
        #_nome: string
        #_preco: number
        #_valorEfeito: number
        +usar(alvo: Personagem)* string
    }

    class PocaoVida {
        +TIPO = "PocaoVida"
        +usar(alvo: Personagem) string
    }

    class PocaoMana {
        +TIPO = "PocaoMana"
        +usar(alvo: Personagem) string
    }

    class ElixirXP {
        +TIPO = "ElixirXP"
        +usar(alvo: Personagem) string
    }

    class Inventario {
        -_capacidade: number
        -_itens: Map~string, [Item, number]~
        +adicionar(item: Item, quantidade: number) void
        +obter(nome: string) Item
        +remover(nome: string) Item
        +listar() ItemQuantidade[]
    }

    class Personagem {
        <<abstract>>
        +CUSTO_ESPECIAL: number
        +JOGAVEL: boolean
        #_nome: string
        #_vidaMax: number
        #_vida: number
        #_manaMax: number
        #_mana: number
        #_forca: number
        #_xp: number
        #_nivel: number
        #_ouro: number
        #_inventario: Inventario
        +atacar(alvo: Personagem)* number
        +habilidadeEspecial(alvo: Personagem)* number
        +receberDano(dano: number) number
        +curar(qtd: number) number
        +ganharXp(qtd: number) boolean
        +usarItem(nomeItem: string) string
    }

    class Guerreiro {
        +CUSTO_ESPECIAL = 10
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Mago {
        +CUSTO_ESPECIAL = 20
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Arqueiro {
        +CUSTO_ESPECIAL = 12
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Monstro {
        +JOGAVEL = false
        +recompensaXp: number
        +recompensaOuro: number
        +atacar(alvo: Personagem) number
        +habilidadeEspecial(alvo: Personagem) number
    }

    class Combate {
        +heroi: Personagem
        +monstro: Monstro
        +log: string[]
        +executar() boolean
        +executarTurno(acao) ResultadoTurno
    }

    class Loja {
        -_catalogo: Map~string, Item~
        +listar() Item[]
        +comprar(comprador: Personagem, nomeItem: string) Item
    }

    class RepositorioRPG {
        +conn: DatabaseSync
        +semearItens(catalogo) void
        +salvar(p: Personagem) void
        +carregar(nome: string) Personagem
        +excluir(nome: string) void
        +inspecionarTabelas() InspecaoBanco
    }

    class RPGError {
        <<exception>>
        +InventarioCheioError
        +OuroInsuficienteError
        +ItemNaoEncontradoError
        +ManaInsuficienteError
        +PersonagemMortoError
        +ValorInvalidoError
        +PersonagemJaExisteError
        +CombateInvalidoError
    }

    IUsavel <|.. Item
    Item <|-- PocaoVida
    Item <|-- PocaoMana
    Item <|-- ElixirXP

    Personagem <|-- Guerreiro
    Personagem <|-- Mago
    Personagem <|-- Arqueiro
    Personagem <|-- Monstro

    Personagem "1" *-- "1" Inventario
    Inventario "1" o-- "0..*" Item
    Combate --> Personagem
    Combate --> Monstro
    Loja --> Item
    RepositorioRPG ..> Personagem
    Personagem ..> RPGError
```

## 2. Diagrama de Sequência — Compra, Combate e Persistência

```mermaid
sequenceDiagram
    actor Jogador as Jogador / UI
    participant Loja
    participant Heroi as Heroi (Guerreiro)
    participant Combate
    participant Monstro
    participant Repo as RepositorioRPG (SQLite)

    Jogador->>Loja: comprar(heroi, "Poção de Vida Grande")
    Loja->>Heroi: verificar capacidade < capacidade_max
    Loja->>Heroi: gastarOuro(50)
    Loja->>Heroi: inventario.adicionar(item)
    Jogador->>Repo: salvar(heroi) [BEGIN ... COMMIT]

    Jogador->>Combate: executarTurno("especial")
    Combate->>Heroi: habilidadeEspecial(monstro)
    Heroi->>Monstro: receberDano(forca * 2)
    Monstro-->>Combate: dano causado

    alt monstro.vivo == true
        Monstro->>Heroi: atacar() -> receberDano(dano)
    else monstro derrotado
        Combate->>Heroi: ganharXp(120) + ganharOuro(40)
    end

    Jogador->>Heroi: usarItem("Poção de Vida Grande")
    Heroi->>Heroi: obter() -> item.usar(this)
    Heroi->>Heroi: inventario.remover(nomeItem)
    Jogador->>Repo: salvar(heroi) [UPDATE personagens & inventario]
```

## 3. Diagrama Entidade-Relacionamento (DER — 3FN)

```mermaid
erDiagram
    personagens ||--o{ inventario : "possui (ON DELETE CASCADE)"
    itens ||--o{ inventario : "compõe"

    personagens {
        INTEGER id PK
        TEXT nome UK
        TEXT classe
        INTEGER nivel
        INTEGER vida_max
        INTEGER vida
        INTEGER mana_max
        INTEGER mana
        INTEGER forca
        INTEGER xp
        INTEGER ouro
        INTEGER capacidade
    }

    inventario {
        INTEGER personagem_id PK,FK
        INTEGER item_id PK,FK
        INTEGER quantidade
    }

    itens {
        INTEGER id PK
        TEXT nome UK
        TEXT tipo
        INTEGER preco
        INTEGER valor_efeito
    }
```

## 4. Diagrama de Componentes e Arquitetura em Camadas

```mermaid
flowchart TB
    subgraph Apresentacao["Camada de Apresentação (React + TypeScript)"]
        Arena["ArenaView"]
        Shop["ShopInventoryView"]
        DbView["DatabaseView"]
        TestsView["ArchitectureTestsView"]
    end

    subgraph Aplicacao["Camada de Aplicação (server.ts — Express REST)"]
        Api["/api/estado · /api/personagens · /api/loja · /api/combate · /api/poc · /api/testes"]
    end

    subgraph Dominio["Camada de Domínio (src/domain/rpg.ts — POO)"]
        Pers["Personagem (Guerreiro, Mago, Arqueiro, Monstro)"]
        Itens["IUsavel / Item (PocaoVida, PocaoMana, ElixirXP)"]
        Serv["Inventario · Combate · Loja · RPGError"]
    end

    subgraph Persistencia["Camada de Persistência (src/server/repositorio.ts)"]
        Repo["RepositorioRPG (node:sqlite)"]
        DbFile[("rpg.db (3FN)")]
        DbMem[(":memory: (11 Testes)")]
    end

    Apresentacao --> Aplicacao
    Aplicacao --> Dominio
    Aplicacao --> Persistencia
    Persistencia --> Dominio
    Repo --> DbFile
    Repo --> DbMem
```
