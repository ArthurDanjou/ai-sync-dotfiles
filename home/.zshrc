export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export PATH="/Library/TeX/texbin:$PATH"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

export HISTFILE=~/.zsh_history
export HISTSIZE=10000
export SAVEHIST=10000
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_FIND_NO_DUPS

bindkey -v
export KEYTIMEOUT=1
bindkey "^[b" backward-word
bindkey "^[f" forward-word

autoload -Uz compinit && compinit
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' menu select

# source "$HOME/.elan/env"

command -v starship >/dev/null && eval "$(starship init zsh)"
command -v zoxide >/dev/null && eval "$(zoxide init zsh)"
command -v fzf >/dev/null && eval "$(fzf --zsh)"
command -v uv >/dev/null && eval "$(uv generate-shell-completion zsh)"
command -v uvx >/dev/null && eval "$(uvx --generate-shell-completion zsh)"
command -v gh >/dev/null && eval "$(gh completion -s zsh)"
command -v tailscale >/dev/null && eval "$(tailscale completion zsh)"
command -v fnm >/dev/null && eval "$(fnm env --use-on-cd --shell zsh)"

alias cd="z"
alias lg="lazygit"
alias lzd="lazydocker"
alias grep="rg"
alias find="fd"
alias ws="cd ~/Workspace"
alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
alias ls="eza --icons=auto --group-directories-first"
alias ll="eza --icons=auto --group-directories-first -l --header --git -h"
alias la="eza --icons=auto --group-directories-first -la --header --git -h"
alias lt="eza --icons=auto --group-directories-first --tree --level=2 --git-ignore"
alias cat="bat"
alias tree="yazi"
export MANPAGER="sh -c 'col -bx | bat -l man -p'"
alias grep="rg"
alias -s {json,yaml,toml,xml,md,txt}=code
alias -s py=python
alias jupyter="uvx jupyterlab"

[ -f "$HOME/.local/bin/env" ] && . "$HOME/.local/bin/env"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
[ -s "$BUN_INSTALL/_bun" ] && source "$BUN_INSTALL/_bun"

export PATH="$HOME/.opencode/bin:$PATH"

if command -v brew >/dev/null; then
  _brew_prefix="$(brew --prefix)"
  [ -f "$_brew_prefix/share/zsh-autosuggestions/zsh-autosuggestions.zsh" ] && source "$_brew_prefix/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
  [ -f "$_brew_prefix/share/zsh-autocomplete/zsh-autocomplete.plugin.zsh" ] && source "$_brew_prefix/share/zsh-autocomplete/zsh-autocomplete.plugin.zsh"
  [ -f "$_brew_prefix/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" ] && source "$_brew_prefix/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
  unset _brew_prefix
fi

export PATH="$HOME/.cargo/bin:$PATH"
command -v ty >/dev/null && eval "$(ty generate-shell-completion zsh)"

# Added by LM Studio CLI (lms)
export PATH="$PATH:$HOME/.lmstudio/bin"
# End of LM Studio CLI section

# bun completions
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
