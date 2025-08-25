OnlyChat is a terminal chat script built on the [PocketFlow](https://github.com/The-Pocket/PocketFlow-Typescript) framework.

Configure your model’s API key in the .json.env
```json
{
    "providers": [
      {
        "name": "local",
        "baseurl": "http://192.168.0.101:44441/v1",
        "apikey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      {
        "name": "OpenWebUI",
        "baseurl": "http://localhost:8080/api",
        "apikey": "sk-08086835f43547a48d2dc81ec4e55f57"
      }
    ]
  }
```

Run the project using the tsx command.
```bash
tsx src/index.ts
```

For detailed information about the code, see README.glm-4.5-air-mxfp4.en.md OR README.glm-4.5-air-mxfp4.zh.md