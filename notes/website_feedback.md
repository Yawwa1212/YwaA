# Website access attempts

## curl attempts

```
$ curl -L https://www.fuc333.com
curl: (56) CONNECT tunnel failed, response 403
```

```
$ curl -L http://www.fuc333.com
Forbidden
```

```
$ curl -L -A 'Mozilla/5.0' https://www.fuc333.com
curl: (56) CONNECT tunnel failed, response 403
```

```
$ curl -L https://www.fuc333.com
curl: (56) CONNECT tunnel failed, response 403
```
