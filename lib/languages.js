// Used by the server (to run code) and the client (to edit it).
// `api` is the OnlineCompiler.io compiler id.

export const LANGUAGES = [
  {
    id: 'python',
    name: 'Python',
    api: 'python-3.14',
    file: 'main.py',
    template: `def greet(name: str) -> str:
    return f"Hello, {name}!"


for who in ["world", "Riff"]:
    print(greet(who))
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    api: 'nodejs-24',
    file: 'main.js',
    template: `const greet = (name) => \`Hello, \${name}!\`;

for (const who of ["world", "Riff"]) {
  console.log(greet(who));
}
`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    api: 'typescript-deno',
    file: 'main.ts',
    template: `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const people: string[] = ["world", "Riff"];
people.forEach((who) => console.log(greet(who)));
`,
  },
  {
    id: 'go',
    name: 'Go',
    api: 'go-1.26',
    file: 'main.go',
    template: `package main

import "fmt"

func greet(name string) string {
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	for _, who := range []string{"world", "Riff"} {
		fmt.Println(greet(who))
	}
}
`,
  },
  {
    id: 'rust',
    name: 'Rust',
    api: 'rust-1.93',
    file: 'main.rs',
    template: `fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    for who in ["world", "Riff"] {
        println!("{}", greet(who));
    }
}
`,
  },
  {
    id: 'java',
    name: 'Java',
    api: 'openjdk-25',
    file: 'Main.java',
    template: `public class Main {
    static String greet(String name) {
        return "Hello, " + name + "!";
    }

    public static void main(String[] args) {
        for (String who : new String[] {"world", "Riff"}) {
            System.out.println(greet(who));
        }
    }
}
`,
  },
  {
    id: 'cpp',
    name: 'C++',
    api: 'g++-15',
    file: 'main.cpp',
    template: `#include <iostream>
#include <string>
#include <vector>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    for (const auto& who : std::vector<std::string>{"world", "Riff"}) {
        std::cout << greet(who) << "\\n";
    }
}
`,
  },
  {
    id: 'c',
    name: 'C',
    api: 'gcc-15',
    file: 'main.c',
    template: `#include <stdio.h>

void greet(const char *name) {
    printf("Hello, %s!\\n", name);
}

int main(void) {
    const char *people[] = {"world", "Riff"};
    for (int i = 0; i < 2; i++) greet(people[i]);
    return 0;
}
`,
  },
  {
    id: 'ruby',
    name: 'Ruby',
    api: 'ruby-4.0',
    file: 'main.rb',
    template: `def greet(name)
  "Hello, #{name}!"
end

%w[world Riff].each { |who| puts greet(who) }
`,
  },
  {
    id: 'php',
    name: 'PHP',
    api: 'php-8.5',
    file: 'main.php',
    template: `<?php

function greet(string $name): string {
    return "Hello, $name!";
}

foreach (["world", "Riff"] as $who) {
    echo greet($who), PHP_EOL;
}
`,
  },
  {
    id: 'bash',
    name: 'Bash',
    api: 'bash-5.2',
    file: 'main.sh',
    template: `greet() {
  echo "Hello, $1!"
}

for who in world Riff; do
  greet "$who"
done
`,
  },
];

export const DEFAULT_LANGUAGE = 'python';

export const byId = (id) =>
  LANGUAGES.find((l) => l.id === id) ?? LANGUAGES.find((l) => l.id === DEFAULT_LANGUAGE);

export const PAD_ID = /^[a-z0-9]{6,32}$/;
