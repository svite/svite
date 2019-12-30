import { parse } from "acorn";
import { generate } from "escodegen";
import { walk } from "estree-walker";
import {
  Identifier,
  TemplateLiteral,
  Program,
  ImportDeclaration,
  TaggedTemplateExpression,
  CallExpression
} from "estree";
import { parse as graphqlParse } from "graphql/language/parser";
import {
  OperationDefinitionNode,
  VariableDefinitionNode
} from "graphql/language/ast";

const generateReplacement = (template: string) => {
  const replacement = (parse(template, {
    sourceType: "module",
    ecmaVersion: 11
  }) as any) as Program;
  return replacement.body[0];
};

const isGqlTag = (node: TaggedTemplateExpression): boolean => {
  if (node.tag) {
    if (node.tag.type === "Identifier") {
      const tagNode = node.tag as Identifier;
      return tagNode.name === "gql";
    } else if (node.tag.type === "CallExpression") {
      const tagNode = node.tag as CallExpression;
      const tagIdentifier = tagNode.callee as Identifier;
      return tagIdentifier.name === "gql";
    }
  }

  return false;
};

export default () => {
  return {
    script: async ({
      content,
      filename
    }: {
      content: string;
      filename: string;
    }) => {
      let ast;

      ast = parse(content, {
        sourceType: "module",
        ecmaVersion: 11,
        locations: true
      });

      ast = JSON.parse(JSON.stringify(ast));

      walk(ast, {
        enter(node, parent, prop, index) {
          if (node.type === "ImportDeclaration") {
            const importDeclaration = node as ImportDeclaration;
            if (importDeclaration.source.value === "svite-graphql") {
              this.replace(
                generateReplacement(
                  `import _query from "svite-graphql/dist/query";`
                )
              );
            }
          }

          if (node.type === "TaggedTemplateExpression") {
            if (isGqlTag(node)) {
              const templateLiteral = node.quasi as TemplateLiteral;
              console.log("templateLiteral");
              if (templateLiteral.quasis.length === 1) {
                const query = generate(templateLiteral.quasis[0]);
                const graphqlAst = graphqlParse(query);
                const operationDefinition = graphqlAst
                  .definitions[0] as OperationDefinitionNode;
                if (operationDefinition.operation === "query") {
                  const variableDefinitions = operationDefinition.variableDefinitions as VariableDefinitionNode[];
                  const variableNames = variableDefinitions.map(
                    variableDefinition => {
                      return variableDefinition.variable.name.value;
                    }
                  );
                  console.log(
                    generateReplacement(`
                  _query(
                    \`${query}\`,
                    ${
                      variableNames.length > 0
                        ? `{ ${variableNames.join(", ")} }`
                        : ""
                    }
                  )
                `)
                  );
                  this.replace(
                    generateReplacement(`
                      _query(
                        \`${query}\`,
                        ${
                          variableNames.length > 0
                            ? `{ ${variableNames.join(", ")} }`
                            : ""
                        }
                      )
                    `)
                  );
                }
              } else {
                throw new Error("Oops");
              }
            }
          }
        }
      });

      const transformedCode = generate(ast);

      return {
        code: transformedCode
      };
    }
  };
};
